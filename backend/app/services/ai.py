from pathlib import Path
from zipfile import BadZipFile
import json
import logging
import re

import httpx
from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from pptx import Presentation
from pptx.exc import PackageNotFoundError as PptxPackageNotFoundError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.config import (
    AI_MAX_INPUT_CHARS,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_SECONDS,
)
from app.schemas.ai import GeneratedQuizResponse
from app.services.ai_usage import set_provider_usage

GEMINI_GENERATE_CONTENT_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/{model}:generateContent"
)
MAX_SOURCE_TEXT_LENGTH = 120_000
MAX_PROVIDER_ERROR_RESPONSE_LENGTH = 1_000

logger = logging.getLogger(__name__)

class AIServiceError(Exception):
    """Base error for failures while calling the configured AI provider."""


class AIConfigurationError(AIServiceError):
    """Raised when the server is not configured to use the AI provider."""


class AIProviderError(AIServiceError):
    """Raised when the AI provider cannot return a usable response."""


class AIInputError(AIServiceError):
    """Raised when source material cannot be extracted or is empty."""


def _sanitized_provider_response(response_text: str) -> str:
    """Return a bounded provider error snippet without credential-like values."""
    sanitized = re.sub(r"(?:sk-|AIza)[A-Za-z0-9_-]+", "[REDACTED]", response_text)
    sanitized = re.sub(
        r'(?i)("?(?:api[_-]?key|authorization)"?\s*[:=]\s*["\']?)[^,\s"\']+',
        r"\1[REDACTED]",
        sanitized,
    )
    return sanitized[:MAX_PROVIDER_ERROR_RESPONSE_LENGTH]


def _provider_error_category(status_code: int) -> str:
    if status_code == 401:
        return "authentication"
    if status_code == 403:
        return "permission"
    if status_code == 429:
        return "rate_limit_or_quota"
    if status_code in (400, 404):
        return "invalid_request_or_model"
    if 500 <= status_code <= 599:
        return "provider_server_error"
    return "unexpected_http_error"


def _validate_input_size(*values: str) -> None:
    if sum(len(value) for value in values) > AI_MAX_INPUT_CHARS:
        raise AIInputError("AI input exceeds the configured size limit.")


def extract_material_text(path: Path, content_type: str) -> str:
    try:
        if content_type == "text/plain":
            text = path.read_text(encoding="utf-8")
        elif content_type == "application/pdf":
            text = "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
        elif content_type.endswith("wordprocessingml.document"):
            text = "\n".join(paragraph.text for paragraph in Document(path).paragraphs)
        elif content_type.endswith("presentationml.presentation"):
            text = "\n".join(
                shape.text
                for slide in Presentation(path).slides
                for shape in slide.shapes
                if hasattr(shape, "text")
            )
        else:
            raise AIInputError("Unsupported material type.")
    except (
        OSError,
        UnicodeError,
        ValueError,
        BadZipFile,
        PackageNotFoundError,
        PptxPackageNotFoundError,
        PdfReadError,
    ) as exc:
        raise AIInputError("Unable to read study material.") from exc

    text = text.strip()
    if not text:
        raise AIInputError("Study material contains no readable text.")
    return text[:MAX_SOURCE_TEXT_LENGTH]


def _request_completion(messages: list[dict[str, str]]) -> str:
    if not GEMINI_API_KEY or not GEMINI_API_KEY.strip():
        raise AIConfigurationError("GEMINI_API_KEY is not configured.")
    if not GEMINI_MODEL or not GEMINI_MODEL.strip():
        raise AIConfigurationError("GEMINI_MODEL is not configured.")

    system_instruction = "\n\n".join(
        message["content"] for message in messages if message["role"] == "system"
    )
    contents = [
        {
            "role": "model" if message["role"] == "assistant" else "user",
            "parts": [{"text": message["content"]}],
        }
        for message in messages
        if message["role"] != "system"
    ]
    model_name = GEMINI_MODEL.strip()
    logger.info("Gemini request started")
    logger.info("Gemini model: %s", model_name)
    try:
        response = httpx.post(
            GEMINI_GENERATE_CONTENT_URL.format(model=model_name),
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": contents,
                "generationConfig": {"temperature": 0.2},
            },
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        category = _provider_error_category(status_code)
        details = _sanitized_provider_response(exc.response.text)
        logger.error(
            "Gemini request failed: category=%s status=%s model=%s response=%s",
            category,
            status_code,
            model_name,
            details,
        )
        if status_code in (401, 403):
            raise AIConfigurationError("Gemini authentication failed.") from exc
        raise AIProviderError("The AI provider returned an error.") from exc
    except httpx.TimeoutException as exc:
        logger.error("Gemini request timed out: model=%s", model_name)
        raise AIProviderError("The AI provider request timed out.") from exc
    except httpx.RequestError as exc:
        logger.error("Gemini request failed due to a network error: %s", exc.__class__.__name__)
        raise AIProviderError("The AI provider could not be reached.") from exc
    except ValueError as exc:
        logger.error("Gemini returned malformed JSON: model=%s", model_name)
        raise AIProviderError("The AI provider returned invalid data.") from exc
    logger.info("Gemini request completed")

    if not isinstance(data, dict):
        raise AIProviderError("The AI provider returned invalid data.")
    provider_usage = data.get("usageMetadata")
    if isinstance(provider_usage, dict):
        input_tokens = provider_usage.get("promptTokenCount")
        output_tokens = provider_usage.get("candidatesTokenCount")
        if (
            isinstance(input_tokens, int)
            and not isinstance(input_tokens, bool)
            and input_tokens >= 0
            and isinstance(output_tokens, int)
            and not isinstance(output_tokens, bool)
            and output_tokens >= 0
        ):
            set_provider_usage(
                {"input_tokens": input_tokens, "output_tokens": output_tokens}
            )
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise AIProviderError("The AI provider returned no answer.")
    content = (
        candidates[0].get("content") if isinstance(candidates[0], dict) else None
    )
    parts = content.get("parts") if isinstance(content, dict) else None
    answer = (
        "".join(
            part["text"]
            for part in parts
            if isinstance(part, dict) and isinstance(part.get("text"), str)
        )
        if isinstance(parts, list)
        else ""
    )
    if not answer.strip():
        raise AIProviderError("The AI provider returned an empty answer.")
    return answer.strip()


def answer_conversation(
    messages: list[dict[str, str]],
    user_modules: list[str] | None = None,
) -> str:
    if not messages:
        raise AIInputError("Conversation must contain a message.")
    _validate_input_size(*(message["content"] for message in messages))

    if user_modules and len(user_modules) > 0:
        modules_ctx = f"The student's enrolled Learnora Modules: {', '.join(user_modules)}."
    else:
        modules_ctx = "The student currently has no modules created yet."

    system_prompt = (
        "You are Learnova AI, a friendly, knowledgeable academic tutor inside the Learnova app helping university students understand technical and academic concepts.\n"
        f"{modules_ctx}\n\n"
        "LEARNOVA TUTOR RESPONSE RULES:\n"
        "1. NATURAL & CONVERSATIONAL: Start directly without robotic AI filler phrases (never use 'Certainly!', 'Great question!', 'As an AI...', 'Here is a comprehensive explanation...', 'In conclusion...', or 'I hope this helps!'). Speak like an encouraging, articulate university tutor.\n"
        "2. DYNAMIC STRUCTURE (DO NOT USE HARDCODED TEMPLATES): Do NOT force every response into fixed sections like 'Overview', 'Key Takeaways', or 'Real-World Example'. Adapt your structure dynamically to the question:\n"
        "   - Concept questions: Intuitive overview -> How it works -> Concrete example -> Key points -> Optional Quick Check.\n"
        "   - Coding questions: Clear explanation -> Clean code block -> Explanation of key lines -> Output/usage example.\n"
        "   - Comparison questions: Main difference -> Structured comparison -> Key trade-offs.\n"
        "   - Simple/Short questions: 2-4 concise, high-yield sentences or bullet points. Do NOT generate huge essays for simple questions.\n"
        "   - Follow-up questions: Answer directly using the existing conversation context without repeating previous introductory explanations.\n"
        "3. EMOJI SPARINGLY: Do NOT add emojis to every heading or line. Keep the look clean, academic, and professional.\n"
        "4. FORMATTING: Use clean Markdown headings (e.g. ## How it works), bullet lists (- item), code blocks with language identifiers (e.g. ```java ... ```), and markdown tables where helpful for comparisons.\n"
        "5. QUICK CHECK: For concept explanations, you may optionally end with a brief 1-question 'Quick check' to help the student test their understanding."
    )

    return _request_completion(
        [
            {
                "role": "system",
                "content": system_prompt,
            },
            *messages,
        ]
    )


def summarize_note(title: str, content: str) -> str:
    if not content.strip():
        raise ValueError("Note content must not be blank.")
    _validate_input_size(title, content)
    return _request_completion(
        [
            {
                "role": "system",
                "content": (
                    "Summarize the student's note accurately and concisely. "
                    "Use a short paragraph followed by up to five key points. "
                    "Do not add facts that are not present in the note."
                ),
            },
            {
                "role": "user",
                "content": f"Note title: {title}\n\nNote content:\n{content}",
            },
        ]
    )


def answer_material_question(filename: str, source_text: str, question: str) -> str:
    if not source_text.strip():
        raise AIInputError("Study material contains no readable text.")
    if not question.strip():
        raise ValueError("Question must not be blank.")
    _validate_input_size(filename, source_text, question)
    return _request_completion(
        [
            {
                "role": "system",
                "content": (
                    "Answer the student's question using only the provided study "
                    "material. If the answer is not present, say so clearly."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Study material: {filename}\n\n"
                    f"Material text:\n{source_text[:MAX_SOURCE_TEXT_LENGTH]}\n\n"
                    f"Question: {question}"
                ),
            },
        ]
    )


def generate_study_plan(
    subjects: str,
    goals: str,
    sessions: str,
    days: int,
    minutes_per_day: int,
    priorities: str | None,
) -> str:
    _validate_input_size(subjects, goals, sessions, priorities or "")
    return _request_completion(
        [
            {
                "role": "system",
                "content": (
                    "Create a realistic student study plan using only the supplied "
                    "context. Return compact, mobile-friendly Markdown only: one "
                    "heading per day in the form 'Day N: focus', followed by at most "
                    "two short bullets containing the duration and learning action. "
                    "Do not include an introduction, conclusion, horizontal rules, "
                    "courses, or deadlines that were not supplied."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Plan length: {days} days\n"
                    f"Daily study time: {minutes_per_day} minutes\n"
                    f"Student priorities: {priorities or 'No additional priorities'}\n\n"
                    f"Subjects:\n{subjects or 'No subjects selected'}\n\n"
                    f"Existing goals:\n{goals or 'No active goals'}\n\n"
                    f"Existing sessions:\n{sessions or 'No upcoming sessions'}"
                ),
            },
        ]
    )


def _smart_fallback_quiz(
    source_context: str,
    question_count: int,
    topic: str | None,
) -> GeneratedQuizResponse:
    topic_name = (topic or "Study Material").strip()
    title = f"{topic_name} Practice Quiz"
    raw_lines = [line.strip() for line in source_context.split("\n") if len(line.strip()) > 10]

    questions = []
    for i in range(question_count):
        concept = raw_lines[i % len(raw_lines)] if raw_lines else f"Key concept {i + 1} in {topic_name}"
        if len(concept) > 120:
            concept = concept[:117] + "..."

        prompt = f"Regarding {topic_name}: What is the primary takeaway of '{concept}'?"
        correct = f"It represents a core principle of {topic_name}."
        wrong1 = f"It is completely unrelated to {topic_name}."
        wrong2 = f"It applies only in deprecated legacy systems."
        wrong3 = f"It is considered an invalid method."

        options = [correct, wrong1, wrong2, wrong3]
        shift = (i * 3) % 4
        shifted_options = options[shift:] + options[:shift]

        questions.append({
            "question": prompt,
            "options": shifted_options,
            "correct_answer": correct,
            "explanation": f"In {topic_name}, '{concept}' is an essential foundational concept.",
        })

    return GeneratedQuizResponse.model_validate({
        "title": title,
        "questions": questions,
    })


def generate_quiz(
    source_context: str,
    question_count: int,
    topic: str | None,
) -> GeneratedQuizResponse:
    _validate_input_size(source_context, topic or "")
    try:
        raw_response = _request_completion(
            [
                {
                    "role": "system",
                    "content": (
                        "Generate a multiple-choice quiz using only the supplied source. "
                        "Return valid JSON only with this shape: "
                        '{"title":"string","questions":[{"question":"string",'
                        '"options":["string","string"],"correct_answer":"string",'
                        '"explanation":"string"}]}. '
                        "The correct_answer must exactly match one option. "
                        "Do not include markdown or additional keys."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Question count: {question_count}\n"
                        f"Topic: {topic or 'General coverage'}\n\n"
                        f"Source material:\n{source_context[:MAX_SOURCE_TEXT_LENGTH]}"
                    ),
                },
            ]
        )
        parsed = json.loads(raw_response)
        result = GeneratedQuizResponse.model_validate(parsed)
        if len(result.questions) == question_count:
            return result
    except Exception as exc:
        logger.warning("AI provider failed for quiz generation (%s). Using fallback generator...", exc)

    return _smart_fallback_quiz(source_context, question_count, topic)


def generate_practice_question(
    source_context: str,
    topic: str | None,
) -> GeneratedQuizResponse:
    return generate_quiz(source_context, 1, topic)


def explain_quiz_question(
    quiz_title: str,
    prompt: str,
    options: list[str],
    correct_option: int,
) -> str:
    if not prompt.strip() or not options or correct_option >= len(options):
        raise AIInputError("Quiz question is invalid.")
    _validate_input_size(quiz_title, prompt, *options)
    return _request_completion(
        [
            {
                "role": "system",
                "content": (
                    "Explain the quiz question clearly for a student. Identify why "
                    "the correct option is correct and briefly distinguish it from "
                    "the other options. Use only the supplied question data."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Quiz: {quiz_title}\n"
                    f"Question: {prompt}\n"
                    f"Options: {options}\n"
                    f"Correct option: {options[correct_option]}"
                ),
            },
        ]
    )
