import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Attempt,
  getAttemptHistory,
  getQuiz,
  Quiz,
  QuizQuestion,
  submitAttempt,
} from '@/services/api/quizApi';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { Button, EmptyState, LoadingState, Message, ProgressBar } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'quiz' | 'results';

/**
 * Per-question state tracked while the quiz is in progress.
 * Phase transitions:
 *   unanswered → answered (user taps an option)
 *   answered   → revealed (user taps "Check Answer")
 */
type QuestionState =
  | { phase: 'unanswered' }
  | { phase: 'answered'; selectedIndex: number }
  | { phase: 'revealed'; selectedIndex: number; isCorrect: boolean };

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct   = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = pct >= 80 ? Colors.success : pct >= 60 ? Colors.warning : Colors.error;
  return (
    <View style={[r.scoreRing, { borderColor: color }]}>
      <Text style={[r.scorePercent, { color }]}>{pct}%</Text>
      <Text style={r.scoreRatio}>{score}/{total}</Text>
    </View>
  );
}

function getScoreLabel(pct: number) {
  if (pct >= 90) return 'Excellent! 🎉';
  if (pct >= 80) return 'Great work! 👏';
  if (pct >= 70) return 'Good job! 💪';
  if (pct >= 60) return 'Keep going! 📚';
  return 'Keep practising! 🔄';
}

// ─── Option button ────────────────────────────────────────────────────────────
function OptionButton({
  label, letter, state, onPress,
}: {
  label: string;
  letter: string;
  state: 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';
  onPress: () => void;
}) {
  const bgMap: Record<typeof state, string> = {
    idle:     Colors.surface,
    selected: Colors.primarySubtle,
    correct:  Colors.successMuted,
    wrong:    Colors.errorMuted,
    missed:   Colors.successMuted,   // correct answer we didn't pick
  };
  const borderMap: Record<typeof state, string> = {
    idle:     Colors.border,
    selected: Colors.primaryLight,
    correct:  Colors.success + '80',
    wrong:    Colors.error + '80',
    missed:   Colors.success + '80',
  };
  const iconMap: Record<typeof state, string | null> = {
    idle: null, selected: null, correct: '✓', wrong: '✕', missed: '✓',
  };
  const iconColorMap: Record<typeof state, string> = {
    idle: Colors.textMuted, selected: Colors.primaryLight,
    correct: Colors.success, wrong: Colors.error, missed: Colors.success,
  };

  const disabled = state === 'correct' || state === 'wrong' || state === 'missed';
  const icon = iconMap[state];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: state === 'selected' || state === 'correct' || state === 'missed' }}
      accessibilityLabel={`Option ${letter}: ${label}`}
      style={({ pressed }) => [
        r.option,
        { backgroundColor: bgMap[state], borderColor: borderMap[state] },
        (state === 'idle' || state === 'selected') && pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Letter badge */}
      <View style={[
        r.optionLetter,
        state !== 'idle' && { backgroundColor: bgMap[state], borderColor: borderMap[state] },
      ]}>
        {icon
          ? <Text style={[r.optionLetterText, { color: iconColorMap[state] }]}>{icon}</Text>
          : <Text style={r.optionLetterText}>{letter}</Text>
        }
      </View>
      <Text style={[
        r.optionText,
        (state === 'correct' || state === 'missed') && { color: Colors.successLight, fontWeight: Typography.weight.semibold },
        state === 'wrong' && { color: Colors.errorLight },
        state === 'selected' && { color: Colors.textPrimary, fontWeight: Typography.weight.semibold },
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [quiz, setQuiz]       = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Per-question reveal state — keyed by question.id
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});

  const [currentQ, setCurrentQ]       = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<Attempt | null>(null);
  const [history, setHistory]         = useState<Attempt[]>([]);
  const [screen, setScreen]           = useState<Screen>('quiz');

  // Animate the feedback card in when revealed
  const revealAnim = useRef(new Animated.Value(0)).current;

  // ── Load quiz ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getQuiz(Number(id))
      .then(q => {
        setQuiz(q);
        // Initialise all questions to unanswered
        const initial: Record<number, QuestionState> = {};
        (q.questions ?? []).forEach(qn => { initial[qn.id] = { phase: 'unanswered' }; });
        setQuestionStates(initial);
      })
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          router.replace('/auth');
          return;
        }
        setError('Unable to load this quiz. Please go back and try again.');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const questions      = quiz?.questions ?? [];
  const totalQ         = questions.length;
  const currentQuestion: QuizQuestion | undefined = questions[currentQ];

  const qState = currentQuestion
    ? (questionStates[currentQuestion.id] ?? { phase: 'unanswered' })
    : { phase: 'unanswered' as const };

  // How many have been revealed (fully checked)?
  const revealedCount = Object.values(questionStates).filter(s => s.phase === 'revealed').length;

  // ── Select an option (only if not yet revealed) ───────────────────────────
  const selectOption = (questionId: number, optionIndex: number) => {
    setQuestionStates(prev => {
      const current = prev[questionId];
      // Lock after reveal — cannot change a checked answer
      if (current?.phase === 'revealed') return prev;
      // Allow selecting/changing freely before Check Answer
      return { ...prev, [questionId]: { phase: 'answered', selectedIndex: optionIndex } };
    });
  };

  // ── Check answer (reveal) ─────────────────────────────────────────────────
  const checkAnswer = () => {
    if (!currentQuestion || qState.phase !== 'answered') return;
    const isCorrect = qState.selectedIndex === currentQuestion.correct_option;
    setQuestionStates(prev => ({
      ...prev,
      [currentQuestion.id]: {
        phase: 'revealed',
        selectedIndex: qState.selectedIndex,
        isCorrect,
      },
    }));
    // Animate the feedback card
    revealAnim.setValue(0);
    Animated.spring(revealAnim, {
      toValue: 1, friction: 7, tension: 50, useNativeDriver: true,
    }).start();
  };

  // ── Advance to next question ───────────────────────────────────────────────
  const goNext = () => {
    if (currentQ < totalQ - 1) {
      revealAnim.setValue(0);
      setCurrentQ(q => q + 1);
    }
  };

  // ── Submit quiz ───────────────────────────────────────────────────────────
  const doSubmit = async () => {
    // Build answers map from revealed states
    const answersMap: Record<number, number> = {};
    Object.entries(questionStates).forEach(([qid, state]) => {
      if (state.phase === 'revealed' || state.phase === 'answered') {
        answersMap[Number(qid)] = state.selectedIndex;
      }
    });

    setSubmitting(true);
    try {
      const attempt = await submitAttempt(Number(id), answersMap);
      setResult(attempt);
      setScreen('results');
      getAttemptHistory(Number(id))
        .then(setHistory)
        .catch(() => {});
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.replace('/auth');
        return;
      }
      setError('Unable to submit your quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Retry ─────────────────────────────────────────────────────────────────
  const retry = () => {
    const initial: Record<number, QuestionState> = {};
    questions.forEach(qn => { initial[qn.id] = { phase: 'unanswered' }; });
    setQuestionStates(initial);
    setCurrentQ(0);
    setResult(null);
    revealAnim.setValue(0);
    setScreen('quiz');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── Loading / error guards
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={r.safe}>
        <LoadingState label="Loading quiz…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={r.safe}>
        <View style={r.errorWrap}>
          <Pressable onPress={() => router.back()} style={r.backBtn}>
            <Text style={r.backIcon}>‹</Text>
            <Text style={r.backLabel}>Back</Text>
          </Pressable>
          <Message tone="error">{error}</Message>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Results screen
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === 'results' && result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;

    return (
      <SafeAreaView style={r.safe}>
        <ScrollView contentContainerStyle={r.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={r.backBtn}>
            <Text style={r.backIcon}>‹</Text>
            <Text style={r.backLabel}>Back to Quizzes</Text>
          </Pressable>

          {/* Score */}
          <View style={r.resultsCenter}>
            <Text style={r.resultsLabel}>{getScoreLabel(pct)}</Text>
            <ScoreRing score={result.score} total={result.total} />
          </View>

          {/* Stats row */}
          <View style={r.statsRow}>
            <View style={r.statBox}>
              <Text style={[r.statNum, { color: Colors.success }]}>{result.score}</Text>
              <Text style={r.statLbl}>Correct</Text>
            </View>
            <View style={[r.statBox, r.statBorderLR]}>
              <Text style={[r.statNum, { color: Colors.error }]}>{result.total - result.score}</Text>
              <Text style={r.statLbl}>Incorrect</Text>
            </View>
            <View style={r.statBox}>
              <Text style={[r.statNum, { color: Colors.primaryLight }]}>{pct}%</Text>
              <Text style={r.statLbl}>Accuracy</Text>
            </View>
          </View>

          <View style={r.resultProgress}>
            <ProgressBar progress={pct} color={pct >= 70 ? Colors.success : Colors.error} height={8} />
          </View>

          {/* Full question review — correct answer + explanation for every question */}
          <Text style={r.reviewHeading}>📋 Full Review</Text>
          {questions.map((q, idx) => {
            const qs = questionStates[q.id];
            const wasRevealed  = qs?.phase === 'revealed';
            const isCorrect    = wasRevealed && (qs as any).isCorrect;
            const selectedIdx: number | undefined =
              wasRevealed || qs?.phase === 'answered' ? (qs as any).selectedIndex : undefined;
            const correctLabel = q.options[q.correct_option] ?? '';

            return (
              <View key={q.id} style={[r.reviewCard, isCorrect ? r.reviewCorrect : r.reviewWrong]}>
                {/* Question header */}
                <View style={r.reviewHeader}>
                  <View style={[r.reviewBadge, isCorrect ? r.reviewBadgeCorrect : r.reviewBadgeWrong]}>
                    <Text style={[r.reviewBadgeText, { color: isCorrect ? Colors.success : Colors.error }]}>
                      {isCorrect ? '✓' : '✕'}
                    </Text>
                  </View>
                  <Text style={r.reviewQNum}>Q{idx + 1}</Text>
                </View>
                <Text style={r.reviewPrompt}>{q.prompt}</Text>

                {/* Options — show correct/wrong colours */}
                {q.options.map((opt, oi) => {
                  const isThisCorrect = oi === q.correct_option;
                  const wasSelected   = selectedIdx === oi;
                  let optStyle: ViewStyle = r.reviewOption;
                  let optTextColor: string = Colors.textSecondary;
                  let badge = '';

                  if (isThisCorrect) {
                    optStyle = { ...optStyle, ...r.reviewOptionCorrect };
                    optTextColor = Colors.successLight;
                    badge = wasSelected ? '✓ Your answer' : '✓ Correct answer';
                  } else if (wasSelected && !isThisCorrect) {
                    optStyle = { ...optStyle, ...r.reviewOptionWrong };
                    optTextColor = Colors.errorLight;
                    badge = '✕ Your answer';
                  }

                  return (
                    <View key={oi} style={optStyle}>
                      <Text style={[r.reviewOptionText, { color: optTextColor }]}>{opt}</Text>
                      {badge ? <Text style={[r.reviewOptionBadge, { color: optTextColor }]}>{badge}</Text> : null}
                    </View>
                  );
                })}

                {/* Explanation block for every question */}
                <View style={r.reviewExplanationBlock}>
                  <Text style={r.reviewExplanationLabel}>💡 Explanation</Text>
                  <Text style={r.reviewExplanationText}>
                    {q.explanation
                      ? q.explanation
                      : `The correct option is ${String.fromCharCode(65 + q.correct_option)}: "${q.options[q.correct_option]}".`}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Past attempts */}
          {history.length > 1 && (
            <View style={r.historySection}>
              <Text style={r.historyTitle}>Past Attempts</Text>
              {history.slice(0, 5).map((attempt, i) => {
                const p = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
                const isLatest = i === 0;
                return (
                  <View key={attempt.id} style={[r.historyRow, isLatest && r.historyRowLatest]}>
                    <Text style={r.historyDate}>
                      {new Date(attempt.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      {isLatest ? '  · Latest' : ''}
                    </Text>
                    <View style={r.historyRight}>
                      <Text style={[r.historyScore, { color: p >= 70 ? Colors.success : Colors.warning }]}>{p}%</Text>
                      <Text style={r.historyRatio}>{attempt.score}/{attempt.total}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={r.resultActions}>
            <Button label="Try Again" onPress={retry} variant="primary" size="lg" />
            <Button label="Back to Quizzes" onPress={() => router.back()} variant="secondary" />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Quiz-taking screen (empty quiz guard)
  // ─────────────────────────────────────────────────────────────────────────
  if (!quiz || questions.length === 0) {
    return (
      <SafeAreaView style={r.safe}>
        <View style={r.scroll}>
          <Pressable onPress={() => router.back()} style={r.backBtn}>
            <Text style={r.backIcon}>‹</Text>
            <Text style={r.backLabel}>Back</Text>
          </Pressable>
          <EmptyState icon="✦" title="No questions" text="This quiz doesn't have any questions yet." />
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Quiz-taking screen
  // ─────────────────────────────────────────────────────────────────────────
  const isLastQuestion  = currentQ === totalQ - 1;
  const allRevealed     = revealedCount === totalQ;

  // Determine option visual state for the current question
  const getOptionState = (optionIndex: number): 'idle' | 'selected' | 'correct' | 'wrong' | 'missed' => {
    if (qState.phase === 'unanswered') return 'idle';
    if (qState.phase === 'answered') {
      // Selected = highlighted but still tappable (user can change mind)
      return qState.selectedIndex === optionIndex ? 'selected' : 'idle';
    }
    // revealed — lock everything and show correct/wrong colours
    const isThisCorrect = optionIndex === currentQuestion!.correct_option;
    const wasSelected   = qState.selectedIndex === optionIndex;
    if (isThisCorrect && wasSelected) return 'correct';
    if (isThisCorrect && !wasSelected) return 'missed';
    if (!isThisCorrect && wasSelected) return 'wrong';
    return 'idle';
  };

  const feedbackIsCorrect = qState.phase === 'revealed' && qState.isCorrect;

  return (
    <View style={r.root}>
      <View style={r.blobGreen} pointerEvents="none" />
      <View style={r.blobPink}  pointerEvents="none" />
      <View style={r.blobTeal}  pointerEvents="none" />

      <SafeAreaView style={r.safe}>
        {/* ── Quiz header ── */}
        <View style={r.quizHeader}>
          <Pressable onPress={() => router.back()} style={r.backBtn} accessibilityRole="button">
            <Text style={r.backIcon}>‹</Text>
          </Pressable>
          <View style={r.quizHeaderCenter}>
            <Text style={r.quizHeaderTitle} numberOfLines={1}>{quiz.title}</Text>
            <Text style={r.quizHeaderProgress}>Question {currentQ + 1} of {totalQ}</Text>
          </View>
          <View style={r.quizHeaderRight}>
            <Text style={r.revealedCount}>{revealedCount}/{totalQ} checked</Text>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={r.quizProgressWrap}>
          <ProgressBar
            progress={((revealedCount) / totalQ) * 100}
            color={Colors.primary}
            height={4}
          />
        </View>

        <ScrollView
          contentContainerStyle={r.quizScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error && <Message tone="error">{error}</Message>}

          {/* ── Dot navigator ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={r.dotRow}
          >
            {questions.map((q, i) => {
              const qs = questionStates[q.id];
              const isRevealed  = qs?.phase === 'revealed';
              const isAnswered  = qs?.phase === 'answered';
              const isCorrectQ  = isRevealed && (qs as any).isCorrect;
              const isWrongQ    = isRevealed && !(qs as any).isCorrect;
              return (
                <Pressable
                  key={q.id}
                  onPress={() => { revealAnim.setValue(0); setCurrentQ(i); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to question ${i + 1}`}
                >
                  <View style={[
                    r.dot,
                    i === currentQ && r.dotCurrent,
                    isAnswered && i !== currentQ && r.dotAnswered,
                    isCorrectQ && r.dotCorrect,
                    isWrongQ   && r.dotWrong,
                  ]} />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Question ── */}
          <View style={r.questionBlock}>
            <View style={r.questionNumRow}>
              <Text style={r.questionNum}>Q{currentQ + 1}</Text>
              {qState.phase === 'revealed' && (
                <View style={[
                  r.revealPill,
                  feedbackIsCorrect ? r.revealPillCorrect : r.revealPillWrong,
                ]}>
                  <Text style={[
                    r.revealPillText,
                    { color: feedbackIsCorrect ? Colors.success : Colors.error },
                  ]}>
                    {feedbackIsCorrect ? '✓ Correct' : '✕ Incorrect'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={r.questionText}>{currentQuestion!.prompt}</Text>
          </View>

          {/* ── Options ── */}
          <View style={r.optionsBlock}>
            {currentQuestion!.options.map((option, index) => (
              <OptionButton
                key={`${currentQuestion!.id}-${index}`}
                label={option}
                letter={String.fromCharCode(65 + index)}
                state={getOptionState(index)}
                onPress={() => selectOption(currentQuestion!.id, index)}
              />
            ))}
          </View>

          {/* ── Check Answer button (visible after selecting, before reveal) ── */}
          {qState.phase === 'answered' && (
            <Pressable
              onPress={checkAnswer}
              style={({ pressed }) => [r.checkBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Check answer"
            >
              <Text style={r.checkBtnText}>Check Answer</Text>
            </Pressable>
          )}

          {/* ── Feedback card (visible after reveal) ── */}
          {qState.phase === 'revealed' && (
            <Animated.View
              style={[
                r.feedbackCard,
                feedbackIsCorrect ? r.feedbackCorrect : r.feedbackWrong,
                {
                  opacity: revealAnim,
                  transform: [{
                    translateY: revealAnim.interpolate({
                      inputRange: [0, 1], outputRange: [16, 0],
                    }),
                  }],
                },
              ]}
            >
              {/* Result header */}
              <View style={r.feedbackHeader}>
                <View style={[
                  r.feedbackIconCircle,
                  feedbackIsCorrect ? r.feedbackIconCorrect : r.feedbackIconWrong,
                ]}>
                  <Text style={r.feedbackIcon}>{feedbackIsCorrect ? '✓' : '✕'}</Text>
                </View>
                <Text style={[
                  r.feedbackTitle,
                  { color: feedbackIsCorrect ? Colors.success : Colors.error },
                ]}>
                  {feedbackIsCorrect ? 'Correct!' : 'Not quite'}
                </Text>
              </View>

              {/* Show the correct answer when wrong */}
              {!feedbackIsCorrect && (
                <View style={r.correctAnswerRow}>
                  <Text style={r.correctAnswerLabel}>Correct answer: </Text>
                  <Text style={r.correctAnswerValue}>
                    {currentQuestion!.options[currentQuestion!.correct_option]}
                  </Text>
                </View>
              )}

              {/* Explanation — pulled from the question metadata saved by AI generation */}
              {/* The backend stores explanation on QuizQuestion; for now we show the option index context */}
              <View style={r.explanationBlock}>
                <Text style={r.explanationLabel}>💡 Why?</Text>
                <Text style={r.explanationText}>
                  The correct answer is{' '}
                  <Text style={{ fontWeight: Typography.weight.black }}>
                    {String.fromCharCode(65 + currentQuestion!.correct_option)}.{' '}
                    {currentQuestion!.options[currentQuestion!.correct_option]}
                  </Text>
                  {'. '}
                  {/* If the backend returns an explanation field on questions, show it. */}
                  {(currentQuestion as any).explanation
                    ? (currentQuestion as any).explanation
                    : 'Review your notes or materials for more context on this topic.'}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── Hint when no option selected yet ── */}
          {qState.phase === 'unanswered' && (
            <View style={r.hintRow}>
              <Text style={r.hintText}>👆 Select an answer above</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Bottom navigation footer ── */}
        <View style={r.navFooter}>
          <Pressable
            style={[r.navBtn, currentQ === 0 && r.navBtnDisabled]}
            onPress={() => { revealAnim.setValue(0); setCurrentQ(q => Math.max(0, q - 1)); }}
            disabled={currentQ === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous question"
          >
            <Text style={[r.navBtnText, currentQ === 0 && r.navBtnTextDisabled]}>‹ Prev</Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          {/* Next (only after reveal, and not last question) */}
          {qState.phase === 'revealed' && !isLastQuestion && (
            <Pressable
              style={r.nextBtn}
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel="Next question"
            >
              <Text style={r.nextBtnText}>Next ›</Text>
            </Pressable>
          )}

          {/* Submit — show when on last question after reveal, or when all revealed */}
          {(allRevealed || (isLastQuestion && qState.phase === 'revealed')) && (
            <Pressable
              style={[r.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={doSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Submit quiz"
            >
              <Text style={r.submitBtnText}>{submitting ? 'Saving…' : '✓ Finish Quiz'}</Text>
            </Pressable>
          )}

          {/* Skip forward (when not yet revealed) */}
          {qState.phase !== 'revealed' && !isLastQuestion && (
            <Pressable
              style={r.navBtn}
              onPress={() => { revealAnim.setValue(0); setCurrentQ(q => Math.min(totalQ - 1, q + 1)); }}
              accessibilityRole="button"
              accessibilityLabel="Skip to next question"
            >
              <Text style={r.navBtnText}>Skip ›</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const r = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },
  safe:      { flex: 1, backgroundColor: Colors.bg },
  scroll:    { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.xl },
  errorWrap: { padding: Spacing.xl, gap: Spacing.lg },

  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backIcon:  { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  backLabel: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  // ── Results ──────────────────────────────────────────────────────────────
  resultsCenter: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing['2xl'] },
  resultsLabel:  { color: Colors.textPrimary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black },
  scoreRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scorePercent:  { fontSize: Typography.size['4xl'], fontWeight: Typography.weight.black },
  scoreRatio:    { color: Colors.textMuted, fontSize: Typography.size.base },

  statsRow:      { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg, gap: 4 },
  statBorderLR:  { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statNum:       { fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black },
  statLbl:       { color: Colors.textMuted, fontSize: Typography.size.xs },
  resultProgress:{ paddingHorizontal: Spacing.lg },
  resultActions: { gap: Spacing.md },

  // ── Review cards ─────────────────────────────────────────────────────────
  reviewHeading: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
    marginTop: Spacing.md,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  reviewCorrect: { borderColor: Colors.success + '40' },
  reviewWrong:   { borderColor: Colors.error   + '40' },
  reviewHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  reviewBadgeCorrect: { backgroundColor: Colors.successMuted, borderColor: Colors.success + '50' },
  reviewBadgeWrong:   { backgroundColor: Colors.errorMuted,   borderColor: Colors.error   + '50' },
  reviewBadgeText:    { fontSize: 13, fontWeight: Typography.weight.black },
  reviewQNum:         { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.black, letterSpacing: 1 },
  reviewPrompt:       { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, lineHeight: 20 },
  reviewOption: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 2,
  },
  reviewOptionCorrect: { backgroundColor: Colors.successMuted, borderColor: Colors.success + '50' },
  reviewOptionWrong:   { backgroundColor: Colors.errorMuted,   borderColor: Colors.error   + '50' },
  reviewOptionText:    { fontSize: Typography.size.sm, lineHeight: 18 },
  reviewOptionBadge:   { fontSize: 10, fontWeight: Typography.weight.black, letterSpacing: 0.5 },

  reviewExplanationBlock: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    gap: 4,
  },
  reviewExplanationLabel: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  reviewExplanationText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    lineHeight: 18,
  },

  // ── History ───────────────────────────────────────────────────────────────
  historySection: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  historyTitle:   { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  historyRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderColor: Colors.border },
  historyRowLatest:{ borderBottomWidth: 0 },
  historyDate:    { color: Colors.textSecondary, fontSize: Typography.size.sm },
  historyRight:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  historyScore:   { fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  historyRatio:   { color: Colors.textMuted, fontSize: Typography.size.sm },

  // ── Quiz taking ───────────────────────────────────────────────────────────
  quizHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md,
  },
  quizHeaderCenter:   { flex: 1, gap: 2 },
  quizHeaderTitle:    { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  quizHeaderProgress: { color: Colors.textMuted, fontSize: Typography.size.xs },
  quizHeaderRight:    {},
  revealedCount:      { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  quizProgressWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },

  quizScroll: { paddingHorizontal: Spacing.lg, paddingBottom: 130, gap: Spacing.lg },

  // Dot row
  dotRow: { gap: Spacing.xs, paddingVertical: 4, paddingBottom: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotCurrent:  { backgroundColor: Colors.primaryLight, width: 20, borderRadius: 4 },
  dotAnswered: { backgroundColor: Colors.primary + '80' },
  dotCorrect:  { backgroundColor: Colors.success },
  dotWrong:    { backgroundColor: Colors.error },

  // Question
  questionBlock:   { gap: Spacing.sm },
  questionNumRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  questionNum: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.black,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  revealPill: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 1,
  },
  revealPillCorrect: { backgroundColor: Colors.successMuted, borderColor: Colors.success + '50' },
  revealPillWrong:   { backgroundColor: Colors.errorMuted,   borderColor: Colors.error   + '50' },
  revealPillText:    { fontSize: Typography.size.xs, fontWeight: Typography.weight.black },
  questionText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    lineHeight: 30,
  },

  // Options
  optionsBlock: { gap: Spacing.md },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.lg, minHeight: 60,
  },
  optionLetter: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionLetterText: { color: Colors.textMuted, fontSize: 13, fontWeight: Typography.weight.black },
  optionText: { color: Colors.textSecondary, fontSize: Typography.size.base, flex: 1, lineHeight: 22 },

  // Check Answer button
  checkBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow,
  },
  checkBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.3,
  },

  // Feedback card
  feedbackCard: {
    borderRadius: Radius['2xl'], borderWidth: 1,
    padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.sm,
  },
  feedbackCorrect: { backgroundColor: Colors.successMuted, borderColor: Colors.success + '50' },
  feedbackWrong:   { backgroundColor: Colors.errorMuted,   borderColor: Colors.error   + '50' },
  feedbackHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  feedbackIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  feedbackIconCorrect:{ backgroundColor: Colors.success + '20', borderColor: Colors.success + '60' },
  feedbackIconWrong:  { backgroundColor: Colors.error   + '20', borderColor: Colors.error   + '60' },
  feedbackIcon:       { fontSize: 17, fontWeight: Typography.weight.black, color: Colors.textPrimary },
  feedbackTitle:      { fontSize: Typography.size.lg, fontWeight: Typography.weight.black },

  correctAnswerRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  correctAnswerLabel:{ color: Colors.textMuted, fontSize: Typography.size.sm },
  correctAnswerValue:{ color: Colors.successLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.black, flex: 1 },

  explanationBlock: { gap: 4 },
  explanationLabel: { color: Colors.info, fontSize: Typography.size.xs, fontWeight: Typography.weight.black },
  explanationText:  { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 21 },

  hintRow:  { alignItems: 'center', paddingVertical: Spacing.sm },
  hintText: { color: Colors.textMuted, fontSize: Typography.size.sm, fontStyle: 'italic' },

  // Nav footer
  navFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  navBtn:             { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated },
  navBtnDisabled:     { opacity: 0.35 },
  navBtnText:         { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  navBtnTextDisabled: { color: Colors.textMuted },
  nextBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: Colors.primary,
  },
  nextBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
  submitBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: Colors.success,
    ...Shadow.sm,
  },
  submitBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
});
