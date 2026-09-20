// ─── AIQuizPreview ────────────────────────────────────────────────────────────
// Interactive quiz player for POST /quizzes/generate results.
// Step-by-step flow:
//   1. Select option -> tap "Check Answer"
//   2. Reveals correct (green ✓) / wrong (red ✕) + explanation box
//   3. Tap "Next Question" to proceed
//   4. Finish to view Full MCQ Review + Score, with "Save to My Quizzes" button.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { Button, Message, ProgressBar, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';
import type { GeneratedQuizQuestion, GeneratedQuizResponse } from '@/types/ai';

interface AIQuizPreviewProps {
  quiz: GeneratedQuizResponse | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onSave?: () => void;
  saving?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function AIQuizPreview({
  quiz,
  loading,
  error,
  onDismiss,
  onSave,
  saving = false,
}: AIQuizPreviewProps) {
  // Current active mode: 'interactive' (question-by-question) or 'review' (full summary)
  const [mode, setMode] = useState<'interactive' | 'review'>('interactive');
  const [currentIdx, setCurrentIdx] = useState(0);

  // Per-question state map: key = index
  const [answers, setAnswers] = useState<
    Record<number, { selectedIdx: number | null; isRevealed: boolean }>
  >({});

  if (!loading && !error && !quiz) return null;

  const questions = quiz?.questions ?? [];
  const totalQ = questions.length;
  const currentQ: GeneratedQuizQuestion | undefined = questions[currentIdx];

  const currentAns = answers[currentIdx] ?? { selectedIdx: null, isRevealed: false };
  const selectedIdx = currentAns.selectedIdx;
  const isRevealed = currentAns.isRevealed;

  // Calculate score
  const correctCount = questions.reduce((acc, q, idx) => {
    const ans = answers[idx];
    if (!ans || !ans.isRevealed || ans.selectedIdx === null) return acc;
    const correctOpt = q.options[ans.selectedIdx];
    return correctOpt === q.correct_answer ? acc + 1 : acc;
  }, 0);

  const revealedCount = Object.values(answers).filter((a) => a.isRevealed).length;
  const isLastQuestion = currentIdx === totalQ - 1;

  // Handle option tap
  const handleSelectOption = (optIdx: number) => {
    if (isRevealed) return; // locked once checked
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: { selectedIdx: optIdx, isRevealed: false },
    }));
  };

  // Handle Check Answer
  const handleCheckAnswer = () => {
    if (selectedIdx === null) return;
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: { selectedIdx, isRevealed: true },
    }));
  };

  // Reset attempt
  const handleTryAgain = () => {
    setAnswers({});
    setCurrentIdx(0);
    setMode('interactive');
  };

  return (
    <View style={styles.card}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>AI Quiz Preview</Text>
        </View>

        <View style={styles.headerRight}>
          {quiz && !loading && totalQ > 0 && (
            <Pressable
              onPress={() => setMode((m) => (m === 'interactive' ? 'review' : 'interactive'))}
              hitSlop={8}
              style={styles.modeToggleBtn}
            >
              <Text style={styles.modeToggleText}>
                {mode === 'interactive' ? 'Full Review' : 'Take Quiz'}
              </Text>
            </Pressable>
          )}

          {onDismiss && !loading && (
            <Pressable
              onPress={onDismiss}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss quiz preview"
            >
              <Text style={styles.dismiss}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Subtitle banner ── */}
      <View style={styles.subBanner}>
        <Text style={styles.subBannerText}>
          {mode === 'interactive'
            ? 'Select answer → tap Check Answer → view explanation'
            : 'Preview complete quiz details before saving'}
        </Text>
      </View>

      {/* ── Loading state ── */}
      {loading && (
        <View style={styles.skeletonWrap}>
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine width="95%" height={14} />
          <SkeletonLine width="88%" height={14} />
          <SkeletonLine width="78%" height={14} />
          <SkeletonLine width="83%" height={14} />
        </View>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <View style={styles.errorWrap}>
          {error === 'rate_limit' ? (
            <AIRateLimitBanner />
          ) : (
            <Message tone="error">{AI_ERROR_MESSAGES[error]}</Message>
          )}
        </View>
      )}

      {/* ── Quiz Content ── */}
      {!loading && !error && quiz && totalQ > 0 && (
        <>
          <Text style={styles.quizTitle}>{quiz.title}</Text>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* MODE 1: INTERACTIVE QUIZ TAKER (1-by-1)                           */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {mode === 'interactive' && currentQ && (
            <View style={styles.interactiveBlock}>
              {/* Progress counter & dot navigation */}
              <View style={styles.progressRow}>
                <Text style={styles.qCounter}>
                  Question {currentIdx + 1} of {totalQ}
                </Text>

                {/* Dot indicators */}
                <View style={styles.dotRow}>
                  {questions.map((_, i) => {
                    const ans = answers[i];
                    const isRev = ans?.isRevealed;
                    const isSel = ans?.selectedIdx !== null;
                    const isCorr =
                      isRev &&
                      ans.selectedIdx !== null &&
                      questions[i].options[ans.selectedIdx] === questions[i].correct_answer;

                    return (
                      <Pressable
                        key={i}
                        onPress={() => setCurrentIdx(i)}
                        hitSlop={6}
                        style={[
                          styles.dot,
                          i === currentIdx && styles.dotCurrent,
                          isSel && !isRev && styles.dotSelected,
                          isRev && isCorr && styles.dotCorrect,
                          isRev && !isCorr && styles.dotWrong,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Progress bar */}
              <ProgressBar
                progress={((currentIdx + 1) / totalQ) * 100}
                color={Colors.primary}
                height={4}
              />

              {/* Question prompt */}
              <Text style={styles.questionPrompt}>{currentQ.question}</Text>

              {/* Options list */}
              <View style={qStyles.optionsList}>
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedIdx === i;
                  const isCorrectOpt = opt === currentQ.correct_answer;

                  let optStyle: any = qStyles.option;
                  let letterStyle: any = qStyles.optLetter;
                  let textStyle: any = qStyles.optText;
                  let icon = null;

                  if (isRevealed) {
                    if (isCorrectOpt) {
                      optStyle = { ...optStyle, ...qStyles.optionCorrect };
                      letterStyle = { ...letterStyle, ...qStyles.optLetterCorrect };
                      textStyle = { ...textStyle, ...qStyles.optTextCorrect };
                      icon = '✓';
                    } else if (isSelected) {
                      optStyle = { ...optStyle, ...qStyles.optionWrong };
                      letterStyle = { ...letterStyle, ...qStyles.optLetterWrong };
                      textStyle = { ...textStyle, ...qStyles.optTextWrong };
                      icon = '✕';
                    }
                  } else if (isSelected) {
                    optStyle = { ...optStyle, ...qStyles.optionSelected };
                    letterStyle = { ...letterStyle, ...qStyles.optLetterSelected };
                    textStyle = { ...textStyle, ...qStyles.optTextSelected };
                  }

                  return (
                    <Pressable
                      key={i}
                      onPress={() => handleSelectOption(i)}
                      disabled={isRevealed}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        optStyle,
                        !isRevealed && pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={letterStyle}>
                        <Text
                          style={[
                            qStyles.optLetterText,
                            isRevealed && isCorrectOpt && qStyles.optLetterTextCorrect,
                          ]}
                        >
                          {OPTION_LETTERS[i] ?? String(i + 1)}
                        </Text>
                      </View>
                      <Text style={textStyle} numberOfLines={4}>
                        {opt}
                      </Text>
                      {icon && (
                        <Text style={isCorrectOpt ? qStyles.checkIcon : qStyles.crossIcon}>
                          {icon}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* "Check Answer" button */}
              {selectedIdx !== null && !isRevealed && (
                <Pressable
                  onPress={handleCheckAnswer}
                  style={({ pressed }) => [qStyles.checkBtn, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  <Text style={qStyles.checkBtnText}>Check Answer</Text>
                </Pressable>
              )}

              {/* Explanation box — appears immediately after checking */}
              {isRevealed && (
                <View style={qStyles.explBox}>
                  <View style={qStyles.explHeader}>
                    <Text style={qStyles.explHeaderIcon}>💡</Text>
                    <Text style={qStyles.explHeaderTitle}>Explanation</Text>
                  </View>
                  <Text style={qStyles.explText}>{currentQ.explanation}</Text>
                </View>
              )}

              {/* Nav actions (Prev / Next / Finish) */}
              <View style={styles.navRow}>
                <Button
                  label="‹ Prev"
                  onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                />

                <View style={{ flex: 1 }} />

                {isRevealed && !isLastQuestion && (
                  <Button
                    label="Next ›"
                    onPress={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}
                    variant="primary"
                    size="sm"
                    fullWidth={false}
                  />
                )}

                {isRevealed && isLastQuestion && (
                  <Button
                    label="Finish & Review ›"
                    onPress={() => setMode('review')}
                    variant="primary"
                    size="sm"
                    fullWidth={false}
                  />
                )}
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* MODE 2: FULL REVIEW & SCORE SUMMARY                             */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {mode === 'review' && (
            <View style={styles.reviewBlock}>
              {/* Score header */}
              {revealedCount > 0 && (
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreTitle}>Quiz Preview Results</Text>
                  <Text style={styles.scoreVal}>
                    {correctCount} / {totalQ} Correct ({Math.round((correctCount / totalQ) * 100)}%)
                  </Text>
                </View>
              )}

              {/* All questions list with correct answers & explanations */}
              <Text style={styles.reviewHeading}>📋 Questions & Answers</Text>
              {questions.map((q, idx) => {
                const ans = answers[idx];
                const isUserCorrect =
                  ans?.isRevealed &&
                  ans.selectedIdx !== null &&
                  q.options[ans.selectedIdx] === q.correct_answer;

                return (
                  <View key={idx} style={styles.reviewQCard}>
                    <View style={styles.reviewQHeader}>
                      <View style={styles.reviewNumBadge}>
                        <Text style={styles.reviewNumText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.reviewQText}>{q.question}</Text>
                    </View>

                    {/* Options list */}
                    <View style={qStyles.optionsList}>
                      {q.options.map((opt, i) => {
                        const isCorrectOpt = opt === q.correct_answer;
                        const wasSelected = ans?.selectedIdx === i;

                        let optStyle: any = qStyles.option;
                        let textStyle: any = qStyles.optText;
                        let badgeText = '';

                        if (isCorrectOpt) {
                          optStyle = { ...optStyle, ...qStyles.optionCorrect };
                          textStyle = { ...textStyle, ...qStyles.optTextCorrect };
                          badgeText = '✓ Correct Answer';
                        } else if (wasSelected) {
                          optStyle = { ...optStyle, ...qStyles.optionWrong };
                          textStyle = { ...textStyle, ...qStyles.optTextWrong };
                          badgeText = '✕ Your Answer';
                        }

                        return (
                          <View key={i} style={optStyle}>
                            <View style={qStyles.optLetter}>
                              <Text style={qStyles.optLetterText}>
                                {OPTION_LETTERS[i] ?? String(i + 1)}
                              </Text>
                            </View>
                            <Text style={textStyle} numberOfLines={4}>
                              {opt}
                            </Text>
                            {badgeText ? (
                              <Text
                                style={
                                  isCorrectOpt
                                    ? qStyles.reviewBadgeCorrect
                                    : qStyles.reviewBadgeWrong
                                }
                              >
                                {badgeText}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>

                    {/* Explanation */}
                    <View style={qStyles.explBox}>
                      <Text style={qStyles.explHeaderTitle}>💡 Explanation</Text>
                      <Text style={qStyles.explText}>{q.explanation}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Action buttons */}
              <View style={styles.reviewActions}>
                <Button
                  label="🔄 Retake Preview"
                  onPress={handleTryAgain}
                  variant="secondary"
                />
                {onSave && (
                  <Button
                    label={saving ? 'Saving Quiz…' : '💾 Save to My Quizzes'}
                    onPress={onSave}
                    loading={saving}
                    disabled={saving}
                    variant="primary"
                  />
                )}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Option & Explanation Styles ─────────────────────────────────────────────
const qStyles = StyleSheet.create({
  optionsList: { gap: Spacing.sm, marginTop: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryLight,
  },
  optionCorrect: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success + '80',
  },
  optionWrong: {
    backgroundColor: Colors.errorMuted,
    borderColor: Colors.error + '80',
  },
  optLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optLetterSelected: { backgroundColor: Colors.primary + '40' },
  optLetterCorrect: { backgroundColor: Colors.success + '30' },
  optLetterWrong: { backgroundColor: Colors.error + '30' },
  optLetterText: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  optLetterTextCorrect: { color: Colors.success },
  optText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    flex: 1,
    lineHeight: 20,
  },
  optTextSelected: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },
  optTextCorrect: { color: Colors.successLight, fontWeight: Typography.weight.bold },
  optTextWrong: { color: Colors.errorLight },
  checkIcon: { color: Colors.success, fontSize: 16, fontWeight: 'bold', flexShrink: 0 },
  crossIcon: { color: Colors.error, fontSize: 16, fontWeight: 'bold', flexShrink: 0 },
  reviewBadgeCorrect: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
  },
  reviewBadgeWrong: {
    color: Colors.error,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
  },
  checkBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  checkBtnText: {
    color: Colors.white,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  explBox: {
    backgroundColor: Colors.infoMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.info + '30',
    padding: Spacing.md,
    marginTop: Spacing.xs,
    gap: 4,
  },
  explHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explHeaderIcon: { fontSize: 14 },
  explHeaderTitle: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  explText: {
    color: Colors.info,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
});

// ─── Main Component Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  badgeIcon: { color: Colors.primaryLight, fontSize: 11 },
  badgeText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wider,
    textTransform: 'uppercase',
  },
  modeToggleBtn: {
    backgroundColor: Colors.surfacePressed,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeToggleText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  dismiss: { color: Colors.textMuted, fontSize: Typography.size.sm },
  subBanner: {
    backgroundColor: Colors.surfacePressed,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  subBannerText: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  skeletonWrap: { gap: Spacing.sm },
  errorWrap: { gap: Spacing.sm },
  quizTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  interactiveBlock: {
    gap: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qCounter: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotCurrent: {
    backgroundColor: Colors.primaryLight,
    transform: [{ scale: 1.25 }],
  },
  dotSelected: {
    backgroundColor: Colors.primary + '60',
  },
  dotCorrect: {
    backgroundColor: Colors.success,
  },
  dotWrong: {
    backgroundColor: Colors.error,
  },
  questionPrompt: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    lineHeight: 22,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  reviewBlock: {
    gap: Spacing.md,
  },
  scoreCard: {
    backgroundColor: Colors.successMuted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.success + '50',
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  scoreTitle: {
    color: Colors.success,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
  },
  scoreVal: {
    color: Colors.successLight,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
  },
  reviewHeading: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.xs,
  },
  reviewQCard: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reviewQHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  reviewNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reviewNumText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  reviewQText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },
  reviewActions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});

