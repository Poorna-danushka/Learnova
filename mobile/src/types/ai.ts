// ─── Learnova Mobile — AI Type Definitions ──────────────────────────────────
// Mirrors backend/app/schemas/ai.py exactly.
// Import from '@/types/ai' in services and components.

// â”€â”€â”€ Note Summarization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Response from POST /notes/{note_id}/summarize */
export interface NoteSummaryResponse {
  note_id: number;
  summary: string;
}

// â”€â”€â”€ Study-Material Q&A â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Request body for POST /study-materials/{material_id}/ask */
export interface MaterialQuestionRequest {
  question: string;
}

/** Response from POST /study-materials/{material_id}/ask */
export interface MaterialQuestionResponse {
  material_id: number;
  answer: string;
}

// â”€â”€â”€ AI Study-Plan Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Request body for POST /study-plans/generate
 *  - module_ids: [] means all subjects
 *  - days: 1â€“30 (default 7)
 *  - minutes_per_day: 15â€“480 (default 60)
 *  - priorities: optional free-text up to 2000 chars
 */
export interface StudyPlanRequest {
  module_ids?: number[];
  days?: number;
  minutes_per_day?: number;
  priorities?: string;
}

/** Response from POST /study-plans/generate */
export interface StudyPlanResponse {
  id?: number;
  plan: string;
  title?: string;
  module_ids?: number[];
  days?: number;
  minutes_per_day?: number;
  priorities?: string;
}

export interface AIConversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// â”€â”€â”€ AI Quiz Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Request body for POST /quizzes/generate
 *  Exactly one of module_id or material_id must be provided.
 *  - question_count: 1â€“20 (default 5)
 *  - topic: optional hint up to 500 chars
 */
export interface QuizGenerationRequest {
  module_id?: number;
  material_id?: number;
  question_count?: number;
  topic?: string;
}

/** A single generated quiz question (not persisted) */
export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export type PracticeQuestionResponse = GeneratedQuizQuestion;

export interface QuizExplanationResponse {
  quiz_id: number;
  question_id: number;
  explanation: string;
}

/** Response from POST /quizzes/generate (ephemeral â€” not saved to DB) */
export interface GeneratedQuizResponse {
  title: string;
  questions: GeneratedQuizQuestion[];
}

// â”€â”€â”€ Shared AI Error Type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Normalised error kind returned by parseAIError().
 *
 * rate_limit  â€” HTTP 429, rolling 24-hour quota exhausted
 * validation  â€” HTTP 422, invalid request payload
 * not_found   â€” HTTP 404, resource doesn't exist / file missing
 * server      â€” HTTP 502/503, upstream AI error or not configured
 * network     â€” timeout or no response
 * unknown     â€” anything else
 */
export type AIErrorKind =
  | 'rate_limit'
  | 'validation'
  | 'not_found'
  | 'server'
  | 'network'
  | 'unknown';
