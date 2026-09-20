import axios from 'axios';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteQuiz, getQuizzes, Quiz, saveGeneratedQuiz, updateQuiz } from '@/services/api/quizApi';
import { getModules, Module as Subject } from '@/services/api/moduleApi';
import { getStudyMaterials, StudyMaterial } from '@/services/api/studyMaterialApi';
import { getNotesByModule } from '@/services/api/noteApi';
import type { Note } from '@/services/api/noteApi';
import { generateQuiz, generatePracticeQuestion, parseAIError, isAuthError, type AIErrorKind } from '@/services/api/aiApi';
import type { GeneratedQuizResponse, PracticeQuestionResponse } from '@/types/ai';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import {
  Badge, BottomNav, Button, Chip, EmptyState,
  Field, Message, SegmentedControl, SkeletonCard,
} from '@/components/ui';
import { AIQuizPreview } from '@/components/AIQuizPreview';

// ─── Small toggle checkbox ─────────────────────────────────────────────────────
function ToggleRow({
  label, sublabel, value, onToggle,
}: {
  label: string; sublabel?: string; value: boolean; onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [ts.toggleRow, pressed && { opacity: 0.75 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <View style={[ts.toggleBox, value && ts.toggleBoxOn]}>
        {value && <Text style={ts.toggleCheck}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ts.toggleLabel}>{label}</Text>
        {sublabel ? <Text style={ts.toggleSub}>{sublabel}</Text> : null}
      </View>
    </Pressable>
  );
}

// ─── Interactive Practice Question Card ──────────────────────────────────────
function PracticeQuestionCard({ question }: { question: PracticeQuestionResponse }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleSelect = (idx: number) => {
    if (isRevealed) return;
    setSelectedIdx(idx);
  };

  const handleCheck = () => {
    if (selectedIdx === null) return;
    setIsRevealed(true);
  };

  return (
    <View style={s.practiceCard}>
      <View style={s.practiceLabelRow}>
        <View style={s.practiceBadge}>
          <Text style={s.practiceBadgeText}>🎲 PRACTICE QUESTION</Text>
        </View>
      </View>
      <Text style={s.practiceQuestion}>{question.question}</Text>

      {question.options.map((opt, idx) => {
        const isSelected = selectedIdx === idx;
        const isCorrectOpt = opt === question.correct_answer;

        let optionStyle: any = s.practiceOption;
        let indicatorStyle: any = s.optionIndicator;
        let icon = String.fromCharCode(65 + idx);

        if (isRevealed) {
          if (isCorrectOpt) {
            optionStyle = [s.practiceOption, s.practiceCorrectOption];
            indicatorStyle = [s.optionIndicator, s.optionIndicatorCorrect];
            icon = '✓';
          } else if (isSelected) {
            optionStyle = [s.practiceOption, s.practiceWrongOption];
            indicatorStyle = [s.optionIndicator, s.optionIndicatorWrong];
            icon = '✕';
          }
        } else if (isSelected) {
          optionStyle = [s.practiceOption, s.practiceSelectedOption];
          indicatorStyle = [s.optionIndicator, s.optionIndicatorSelected];
        }

        return (
          <Pressable
            key={opt}
            onPress={() => handleSelect(idx)}
            disabled={isRevealed}
            style={({ pressed }) => [optionStyle, !isRevealed && pressed && { opacity: 0.85 }]}
          >
            <View style={indicatorStyle}>
              <Text style={s.optionIndicatorText}>{icon}</Text>
            </View>
            <Text
              style={[
                s.practiceOptionText,
                isRevealed && isCorrectOpt && s.practiceCorrectText,
                isRevealed && isSelected && !isCorrectOpt && s.practiceWrongText,
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}

      {selectedIdx !== null && !isRevealed && (
        <Pressable
          onPress={handleCheck}
          style={({ pressed }) => [s.practiceCheckBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.practiceCheckBtnText}>Check Answer</Text>
        </Pressable>
      )}

      {isRevealed && question.explanation ? (
        <View style={s.practiceExplain}>
          <Text style={s.practiceExplainLabel}>💡 Explanation</Text>
          <Text style={s.practiceExplainText}>{question.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { module_id } = useLocalSearchParams<{ module_id?: string }>();

  const [quizzes, setQuizzes]     = useState<Quiz[]>([]);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Animation values
  const fadeAnim  = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  useEffect(() => {
    if (!loading && quizzes.length > 0) {
      Animated.parallel([
        Animated.spring(fadeAnim,  { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, quizzes.length]);

  // AI form state
  const [showAI, setShowAI]               = useState(false);
  const [aiMode, setAiMode]               = useState('From Module');

  // Module source
  const [selectedSubId, setSelectedSubId] = useState<number | undefined>();
  // use_own_content toggle (module mode)
  const [ownContentModule, setOwnContentModule] = useState(false);
  // Note picker inside "From Module"
  const [moduleNotes, setModuleNotes]     = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes]   = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | undefined>();

  // Material source
  const [selectedMatId, setSelectedMatId] = useState<number | undefined>();
  // Notes for the material's module (note picker inside "From Material")
  const [matModuleNotes, setMatModuleNotes]   = useState<Note[]>([]);
  const [loadingMatNotes, setLoadingMatNotes] = useState(false);
  const [selectedMatNoteId, setSelectedMatNoteId] = useState<number | undefined>();

  const [qCount, setQCount]               = useState('5');
  const [topic, setTopic]                 = useState('');
  const [generating, setGenerating]       = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuizResponse | null>(null);
  const [aiError, setAiError]             = useState<AIErrorKind | null>(null);
  const [practiceQ, setPracticeQ]         = useState<PracticeQuestionResponse | null>(null);
  const [genQuestion, setGenQuestion]     = useState(false);
  const [saving, setSaving]               = useState(false);

  // Filter for saved quizzes list
  const [selectedFilterSubId, setSelectedFilterSubId] = useState<number | undefined>(
    module_id ? Number(module_id) : undefined
  );

  // Edit modal
  const [editingQuiz, setEditingQuiz]     = useState<Quiz | null>(null);
  const [editTitle, setEditTitle]         = useState('');
  const [editDesc, setEditDesc]           = useState('');
  const [savingEdit, setSavingEdit]       = useState(false);

  // ── Load initial data ──────────────────────────────────────────────────────
  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [qList, sList, mList] = await Promise.all([
        getQuizzes(), getModules(), getStudyMaterials(),
      ]);
      setQuizzes(qList);
      setSubjects(sList);
      setMaterials(mList);
      if (sList.length && !selectedSubId) setSelectedSubId(sList[0].id);
      if (mList.length && !selectedMatId) setSelectedMatId(mList[0].id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Unable to load quizzes.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Auto-select module if module_id is provided in URL
  useEffect(() => {
    if (module_id && subjects.length > 0) {
      const id = Number(module_id);
      if (subjects.some(s => s.id === id)) {
        setSelectedSubId(id);
        setShowAI(true);
      }
    }
  }, [module_id, subjects]);

  // ── Fetch notes when module selection changes (From Module mode) ───────────
  useEffect(() => {
    if (!selectedSubId) { setModuleNotes([]); setSelectedNoteId(undefined); return; }
    setLoadingNotes(true);
    setSelectedNoteId(undefined);
    getNotesByModule(selectedSubId)
      .then(notes => { setModuleNotes(notes); })
      .catch(() => setModuleNotes([]))
      .finally(() => setLoadingNotes(false));
  }, [selectedSubId]);

  // ── Fetch notes when material selection changes (From Material mode) ───────
  useEffect(() => {
    const mat = materials.find(m => m.id === selectedMatId);
    if (!mat?.module_id) { setMatModuleNotes([]); setSelectedMatNoteId(undefined); return; }
    setLoadingMatNotes(true);
    setSelectedMatNoteId(undefined);
    getNotesByModule(mat.module_id)
      .then(notes => setMatModuleNotes(notes))
      .catch(() => setMatModuleNotes([]))
      .finally(() => setLoadingMatNotes(false));
  }, [selectedMatId, materials]);

  // ── Build request payload ──────────────────────────────────────────────────
  const buildRequest = () => {
    if (aiMode === 'From Module') {
      // If a specific note is selected inside the module, use that
      if (selectedNoteId) {
        return { note_id: selectedNoteId, use_own_content: true };
      }
      return {
        module_id: selectedSubId,
        use_own_content: ownContentModule,
      };
    }
    // From Material mode
    // If a specific note is selected alongside the material, use the note
    if (selectedMatNoteId) {
      return { note_id: selectedMatNoteId, use_own_content: true };
    }
    return { material_id: selectedMatId, use_own_content: true };
  };

  // ── Validate before generating ─────────────────────────────────────────────
  const validate = () => {
    if (aiMode === 'From Module') {
      if (!selectedSubId) { setError('Select a module.'); return false; }
    } else {
      if (!selectedMatId) { setError('Select a material.'); return false; }
    }
    const count = parseInt(qCount, 10);
    if (!Number.isFinite(count) || count < 1 || count > 20) {
      setError('Question count must be 1–20.');
      return false;
    }
    return true;
  };

  // ── Generate full quiz ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (generating || !validate()) return;
    setGenerating(true); setGeneratedQuiz(null); setAiError(null); setError(null);
    try {
      const count = parseInt(qCount, 10);
      const res = await generateQuiz({
        ...buildRequest(),
        question_count: count,
        topic: topic.trim() || undefined,
      });
      setGeneratedQuiz(res);
    } catch (err) {
      if (isAuthError(err)) { signOut(); return; }
      setAiError(parseAIError(err));
    } finally { setGenerating(false); }
  };

  // ── Generate single practice question ──────────────────────────────────────
  const handleGenQuestion = async () => {
    if (genQuestion || !validate()) return;
    setGenQuestion(true); setPracticeQ(null); setAiError(null); setError(null);
    try {
      setPracticeQ(await generatePracticeQuestion({
        ...buildRequest(),
        topic: topic.trim() || undefined,
      }));
    } catch (err) {
      if (isAuthError(err)) { signOut(); return; }
      setAiError(parseAIError(err));
    } finally { setGenQuestion(false); }
  };

  // ── Save generated quiz ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!generatedQuiz || saving) return;
    let subId: number | undefined;
    if (aiMode === 'From Module') {
      subId = selectedSubId;
    } else {
      subId = materials.find(m => m.id === selectedMatId)?.module_id;
    }
    // If source was a specific note, derive module from it
    if (!subId && (selectedNoteId || selectedMatNoteId)) {
      const note = moduleNotes.find(n => n.id === selectedNoteId)
        ?? matModuleNotes.find(n => n.id === selectedMatNoteId);
      subId = note?.module_id;
    }
    // Fallback to module_id from URL params if provided
    if (!subId && module_id) {
      subId = Number(module_id);
    }
    // Fallback to first available module
    if (!subId && subjects.length > 0) {
      subId = subjects[0].id;
    }

    if (!subId) { setError('Select a module to save this quiz under.'); return; }
    setSaving(true); setError(null);
    try {
      const saved = await saveGeneratedQuiz(subId, generatedQuiz);
      setQuizzes(p => [saved, ...p]);
      setGeneratedQuiz(null);
      setShowAI(false);
      // Auto-start taking the newly created quiz saved under the relevant module
      router.push({ pathname: '/quiz/[id]', params: { id: String(saved.id) } });
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError('Failed to save quiz under module.');
    } finally { setSaving(false); }
  };

  // ── Delete quiz ────────────────────────────────────────────────────────────
  const handleDelete = (quiz: Quiz) => {
    const remove = async () => {
      try {
        await deleteQuiz(quiz.id);
        setQuizzes(p => p.filter(q => q.id !== quiz.id));
      } catch (err) {
        if (isAuthError(err)) signOut();
        else setError('Failed to delete quiz.');
      }
    };
    if (Platform.OS === 'web') { void remove(); return; }
    Alert.alert('Delete Quiz', `Delete "${quiz.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  // ── Edit quiz ──────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editingQuiz || savingEdit || !editTitle.trim()) return;
    setSavingEdit(true); setError(null);
    try {
      const updated = await updateQuiz(editingQuiz.id, {
        title: editTitle.trim(), description: editDesc.trim() || undefined,
      });
      setQuizzes(p => p.map(q => q.id === updated.id ? { ...q, ...updated } : q));
      setEditingQuiz(null);
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError('Failed to update quiz.');
    } finally { setSavingEdit(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetAIForm = () => {
    setGeneratedQuiz(null); setPracticeQ(null); setAiError(null);
    setSelectedNoteId(undefined); setSelectedMatNoteId(undefined);
    setOwnContentModule(false); setTopic(''); setQCount('5');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* ── Page header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.pageTitle}>🎯 Quizzes</Text>
            <Text style={s.pageSubtitle}>
              {loading ? 'Loading…' : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
            </Text>
          </View>
          <Pressable
            onPress={() => { if (showAI) resetAIForm(); setShowAI(v => !v); }}
            style={({ pressed }) => [
              s.aiToggleBtn,
              showAI && s.aiToggleBtnActive,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
            accessibilityRole="button"
          >
            <Text style={[s.aiToggleText, showAI && s.aiToggleTextActive]}>
              {showAI ? '✕ Close' : '✨ AI Generate'}
            </Text>
          </Pressable>
        </View>

        {/* ── Stats strip ── */}
        {!loading && quizzes.length > 0 && (
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
                <Text style={s.statIcon}>📝</Text>
              </View>
              <View>
                <Text style={s.statValue}>{quizzes.length}</Text>
                <Text style={s.statLabel}>Total</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.info + '15', borderColor: Colors.info + '30' }]}>
                <Text style={s.statIcon}>❓</Text>
              </View>
              <View>
                <Text style={s.statValue}>
                  {quizzes.reduce((acc, q) => acc + (q.questions?.length ?? 0), 0)}
                </Text>
                <Text style={s.statLabel}>Questions</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '30' }]}>
                <Text style={s.statIcon}>✨</Text>
              </View>
              <View>
                <Text style={s.statValue}>{subjects.length}</Text>
                <Text style={s.statLabel}>Modules</Text>
              </View>
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); void load(true); }}
                tintColor={Colors.primaryLight}
              />
            }
          >
            {error && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}

            {/* ── Edit form modal ── */}
            <Modal
              visible={!!editingQuiz}
              transparent
              animationType="fade"
              onRequestClose={() => setEditingQuiz(null)}
            >
              <KeyboardAvoidingView
                style={s.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <Pressable style={s.modalBackdrop} onPress={() => setEditingQuiz(null)} />
                <View style={s.modalCard}>
                  <View style={s.modalTitleRow}>
                    <Text style={s.editCardTitle}>✏️ Edit Quiz</Text>
                    <Pressable onPress={() => setEditingQuiz(null)} hitSlop={10} style={s.modalCloseBtn}>
                      <Text style={s.modalCloseText}>✕</Text>
                    </Pressable>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScrollContent}>
                    <Field label="Title" value={editTitle} onChangeText={setEditTitle} placeholder="Quiz title" />
                    <Field label="Description (optional)" value={editDesc} onChangeText={setEditDesc} placeholder="Brief description…" multiline />
                  </ScrollView>
                  <View style={s.editActions}>
                    <Button label="Cancel" onPress={() => setEditingQuiz(null)} variant="ghost" size="sm" fullWidth={false} />
                    <Button label={savingEdit ? 'Saving…' : 'Save Changes'} onPress={saveEdit} loading={savingEdit} size="sm" fullWidth={false} />
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>

            {/* ── AI Generator panel ── */}
            {showAI && (
              <View style={s.aiCard}>
                {/* Header */}
                <View style={s.aiCardHeader}>
                  <View style={s.aiHeaderIcon}>
                    <Text style={{ fontSize: 22 }}>✨</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.aiCardTitle}>AI Quiz Generator</Text>
                    <Text style={s.aiCardSubtitle}>
                      Generate questions from your modules, notes, or uploaded materials.
                    </Text>
                  </View>
                </View>

                {/* Source mode toggle */}
                <SegmentedControl
                  options={['From Module', 'From Material']}
                  selected={aiMode}
                  onSelect={(mode) => {
                    setAiMode(mode);
                    setGeneratedQuiz(null); setPracticeQ(null); setAiError(null);
                    setSelectedNoteId(undefined); setSelectedMatNoteId(undefined);
                  }}
                />

                {/* ── FROM MODULE ── */}
                {aiMode === 'From Module' && (
                  <View style={s.sourceSection}>
                    <Text style={s.sourceSectionLabel}>📚 Select Module</Text>
                    {subjects.length === 0 ? (
                      <Text style={s.emptyHint}>No modules yet. Create one first.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                        {subjects.map(sub => (
                          <Chip
                            key={sub.id}
                            label={sub.name}
                            active={selectedSubId === sub.id}
                            onPress={() => setSelectedSubId(sub.id)}
                            color={sub.color}
                          />
                        ))}
                      </ScrollView>
                    )}

                    {/* Own-content-only toggle */}
                    <ToggleRow
                      label="Use my content only"
                      sublabel="AI will draw only from your notes & materials, not general knowledge"
                      value={ownContentModule}
                      onToggle={() => {
                        setOwnContentModule(v => !v);
                        // Clear note selection when toggling off
                        if (ownContentModule) setSelectedNoteId(undefined);
                      }}
                    />

                    {/* Note picker — visible only when own-content is ON */}
                    {ownContentModule && selectedSubId && (
                      <View style={s.notePickerSection}>
                        <Text style={s.notePickerLabel}>
                          📄 Narrow to a specific note <Text style={s.notePickerOptional}>(optional)</Text>
                        </Text>
                        {loadingNotes ? (
                          <Text style={s.emptyHint}>Loading notes…</Text>
                        ) : moduleNotes.length === 0 ? (
                          <Text style={s.emptyHint}>No notes in this module yet.</Text>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                            {/* "All notes" deselect pill */}
                            <Chip
                              label="All notes"
                              active={selectedNoteId === undefined}
                              onPress={() => setSelectedNoteId(undefined)}
                            />
                            {moduleNotes.map(note => (
                              <Chip
                                key={note.id}
                                label={note.title}
                                active={selectedNoteId === note.id}
                                onPress={() => setSelectedNoteId(
                                  selectedNoteId === note.id ? undefined : note.id
                                )}
                              />
                            ))}
                          </ScrollView>
                        )}
                        {selectedNoteId && (
                          <View style={s.noteSelectedBanner}>
                            <Text style={s.noteSelectedIcon}>📌</Text>
                            <Text style={s.noteSelectedText}>
                              Quiz will be generated from this note only
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Info hint when own-content is OFF */}
                    {!ownContentModule && (
                      <View style={s.infoBox}>
                        <Text style={s.infoIcon}>💡</Text>
                        <Text style={s.infoText}>
                          The module needs notes or uploaded materials for best results.
                          Enable "Use my content only" to restrict AI to your own content.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ── FROM MATERIAL ── */}
                {aiMode === 'From Material' && (
                  <View style={s.sourceSection}>
                    <Text style={s.sourceSectionLabel}>📄 Select Material</Text>
                    {materials.length === 0 ? (
                      <Text style={s.emptyHint}>No materials yet. Upload one first.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                        {materials.map(m => (
                          <Chip
                            key={m.id}
                            label={m.original_filename}
                            active={selectedMatId === m.id}
                            onPress={() => setSelectedMatId(m.id)}
                          />
                        ))}
                      </ScrollView>
                    )}

                    {/* Note picker alongside the material */}
                    {selectedMatId && (
                      <View style={s.notePickerSection}>
                        <Text style={s.notePickerLabel}>
                          📝 Or use a note instead <Text style={s.notePickerOptional}>(optional)</Text>
                        </Text>
                        {loadingMatNotes ? (
                          <Text style={s.emptyHint}>Loading notes…</Text>
                        ) : matModuleNotes.length === 0 ? (
                          <Text style={s.emptyHint}>No notes in this module.</Text>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                            <Chip
                              label="Use material"
                              active={selectedMatNoteId === undefined}
                              onPress={() => setSelectedMatNoteId(undefined)}
                            />
                            {matModuleNotes.map(note => (
                              <Chip
                                key={note.id}
                                label={note.title}
                                active={selectedMatNoteId === note.id}
                                onPress={() => setSelectedMatNoteId(
                                  selectedMatNoteId === note.id ? undefined : note.id
                                )}
                              />
                            ))}
                          </ScrollView>
                        )}
                        {selectedMatNoteId && (
                          <View style={s.noteSelectedBanner}>
                            <Text style={s.noteSelectedIcon}>📌</Text>
                            <Text style={s.noteSelectedText}>
                              Quiz will be generated from this note only
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={s.infoBox}>
                      <Text style={s.infoIcon}>🔒</Text>
                      <Text style={s.infoText}>
                        Material-based quizzes always use your uploaded content only.
                      </Text>
                    </View>
                  </View>
                )}

                {/* ── Params row ── */}
                <View style={s.paramRow}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Questions (1–20)"
                      value={qCount}
                      onChangeText={setQCount}
                      keyboardType="numeric"
                      placeholder="5"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Topic hint (optional)"
                      value={topic}
                      onChangeText={setTopic}
                      placeholder="e.g. Chapter 3"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* ── Action buttons ── */}
                <Button
                  label={generating ? 'Generating…' : '✨  Generate Quiz'}
                  onPress={handleGenerate}
                  loading={generating}
                  disabled={generating || genQuestion}
                />
                <Button
                  label={genQuestion ? 'Generating…' : '🎲 Practice Question'}
                  onPress={handleGenQuestion}
                  loading={genQuestion}
                  disabled={generating || genQuestion}
                  variant="secondary"
                />

                {/* ── Practice question card ── */}
                {practiceQ && (
                  <PracticeQuestionCard question={practiceQ} />
                )}

                {/* ── Generated quiz preview & save ── */}
                <AIQuizPreview
                  quiz={generatedQuiz}
                  loading={generating}
                  error={aiError}
                  onDismiss={() => { setGeneratedQuiz(null); setAiError(null); }}
                  onSave={handleSave}
                  saving={saving}
                />
              </View>
            )}

            {/* ── Quiz list ── */}
            <View style={s.listSection}>
              <View style={s.listHeaderRow}>
                <Text style={s.listLabel}>📋 SAVED QUIZZES</Text>
                {subjects.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                    <Chip
                      label="All Modules"
                      active={selectedFilterSubId === undefined}
                      onPress={() => setSelectedFilterSubId(undefined)}
                    />
                    {subjects.map(sub => (
                      <Chip
                        key={sub.id}
                        label={sub.name}
                        active={selectedFilterSubId === sub.id}
                        onPress={() => setSelectedFilterSubId(selectedFilterSubId === sub.id ? undefined : sub.id)}
                        color={sub.color}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>

              {loading ? (
                <><SkeletonCard /><SkeletonCard /></>
              ) : (selectedFilterSubId ? quizzes.filter(q => q.module_id === selectedFilterSubId) : quizzes).length === 0 ? (
                <EmptyState
                  icon="🎯"
                  title={selectedFilterSubId ? "No quizzes for this module" : "No quizzes yet"}
                  text={selectedFilterSubId ? "Generate an AI quiz for this module to save it here." : "Generate an AI quiz from your notes or materials."}
                  action="✨ Generate Quiz"
                  onAction={() => setShowAI(true)}
                />
              ) : (
                (selectedFilterSubId ? quizzes.filter(q => q.module_id === selectedFilterSubId) : quizzes).map(quiz => {
                  const quizModule = subjects.find(sub => sub.id === quiz.module_id);
                  const mColor = quizModule?.color || Colors.primary;
                  return (
                    <Animated.View
                      key={quiz.id}
                      style={{
                        opacity: fadeAnim,
                        transform: [
                          { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                          { scale: scaleAnim },
                        ],
                      }}
                    >
                      <Pressable
                        onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: String(quiz.id) } })}
                        style={({ pressed }) => [s.quizCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                      >
                        <View style={[s.quizIconWrap, { backgroundColor: mColor + '15', borderColor: mColor + '30' }]}>
                          <Text style={s.quizIcon}>🎯</Text>
                        </View>
                        <View style={s.quizBody}>
                          <View style={s.quizTop}>
                            <Text style={s.quizTitle} numberOfLines={2}>{quiz.title}</Text>
                            <Text style={s.quizChevron}>›</Text>
                          </View>
                          {quiz.description ? <Text style={s.quizDesc} numberOfLines={1}>{quiz.description}</Text> : null}
                          <View style={s.quizMeta}>
                            {quizModule && (
                              <View style={[s.moduleBadgePill, { backgroundColor: mColor + '1B', borderColor: mColor + '40' }]}>
                                <Text style={[s.moduleBadgePillText, { color: mColor }]}>
                                  📚 {quizModule.name}
                                </Text>
                              </View>
                            )}
                            {(quiz.questions?.length ?? 0) > 0 && (
                              <View style={s.quizMetaItem}>
                                <Text style={s.quizMetaIcon}>❓</Text>
                                <Text style={s.quizMetaText}>{quiz.questions!.length} questions</Text>
                              </View>
                            )}
                            <View style={s.quizMetaItem}>
                              <Text style={s.quizMetaIcon}>📅</Text>
                              <Text style={s.quizMetaText}>
                                {new Date(quiz.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                          </View>
                          <View style={s.quizActions}>
                            <Pressable
                              onPress={e => { e?.stopPropagation?.(); setEditingQuiz(quiz); setEditTitle(quiz.title); setEditDesc(quiz.description || ''); }}
                              hitSlop={8}
                              style={({ pressed }) => [s.quizEditBtn, pressed && { opacity: 0.7 }]}
                            >
                              <Text style={s.quizEditText}>✏️ Edit</Text>
                            </Pressable>
                            <Pressable
                              onPress={e => { e?.stopPropagation?.(); handleDelete(quiz); }}
                              hitSlop={8}
                              style={({ pressed }) => [s.quizDeleteBtn, pressed && { opacity: 0.7 }]}
                            >
                              <Text style={s.quizDeleteText}>🗑️ Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Modules" onNavigate={r => router.push(r as never)} />
    </View>
  );
}

// ─── Toggle styles ─────────────────────────────────────────────────────────────
const ts = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  toggleBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  toggleBoxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleCheck: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: Typography.weight.black,
  },
  toggleLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    lineHeight: 20,
  },
  toggleSub: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    lineHeight: 17,
    marginTop: 2,
  },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.md,
  },
  pageTitle:    { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  pageSubtitle: { color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: 2 },

  aiToggleBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    ...Shadow.md,
  },
  aiToggleBtnActive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border, borderWidth: 1 },
  aiToggleText:      { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  aiToggleTextActive:{ color: Colors.textMuted },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border,
    marginHorizontal: Spacing.lg, marginVertical: Spacing.md,
    padding: Spacing.md, gap: Spacing.md,
    ...Shadow.md,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statIconWrap: {
    width: 40, height: 40, borderRadius: Radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statIcon:  { fontSize: 18 },
  statValue: { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  statLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: -2 },
  statDivider: { width: 1, backgroundColor: Colors.border },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 200, gap: Spacing.lg },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  modalCard: {
    width: '100%', maxWidth: 480, maxHeight: '85%',
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.lg,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText:    { color: Colors.textMuted, fontSize: 14, fontWeight: Typography.weight.bold },
  modalScrollContent:{ gap: Spacing.md, paddingVertical: Spacing.xs },
  editCardTitle:     { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  editActions:       { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },

  // AI card
  aiCard: {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.primary + '35', padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.md,
  },
  aiCardHeader:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xs },
  aiHeaderIcon: {
    width: 44, height: 44, borderRadius: Radius.lg,
    backgroundColor: Colors.primary + '20', borderWidth: 1, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  aiCardTitle:    { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  aiCardSubtitle: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20, marginTop: 2 },

  sourceSection:       { gap: Spacing.sm },
  sourceSectionLabel:  { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  emptyHint:           { color: Colors.textMuted, fontSize: Typography.size.xs, fontStyle: 'italic', paddingVertical: Spacing.xs },
  chipRow:             { gap: Spacing.sm, paddingVertical: Spacing.xs },

  // Note picker
  notePickerSection: {
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    padding: Spacing.md,
  },
  notePickerLabel:    { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  notePickerOptional: { color: Colors.textMuted, fontWeight: Typography.weight.regular, fontStyle: 'italic' },
  noteSelectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primarySubtle, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.primaryMuted, padding: Spacing.sm,
  },
  noteSelectedIcon: { fontSize: 14 },
  noteSelectedText: { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, flex: 1 },

  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.infoMuted, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.info + '35', padding: Spacing.md,
  },
  infoIcon: { fontSize: 16, flexShrink: 0 },
  infoText: { color: Colors.infoLight, fontSize: Typography.size.xs, lineHeight: 18, flex: 1, fontWeight: Typography.weight.medium },

  paramRow: { flexDirection: 'row', gap: Spacing.md },

  // Practice question card
  practiceCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.primary + '35', padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.md,
  },
  practiceLabelRow:   { flexDirection: 'row' },
  practiceBadge:      { backgroundColor: Colors.primarySubtle, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primaryMuted },
  practiceBadgeText:  { color: Colors.primaryLight, fontSize: 10, fontWeight: Typography.weight.black, letterSpacing: 1.5 },
  practiceQuestion:   { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black, lineHeight: 24 },
  practiceOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  practiceSelectedOption: { borderColor: Colors.primaryLight, backgroundColor: Colors.primarySubtle },
  practiceCorrectOption:  { borderColor: Colors.success + '60', backgroundColor: Colors.successMuted },
  practiceWrongOption:    { borderColor: Colors.error + '60', backgroundColor: Colors.errorMuted },
  optionIndicator: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionIndicatorSelected:{ backgroundColor: Colors.primary + '30', borderColor: Colors.primaryLight },
  optionIndicatorCorrect: { backgroundColor: Colors.success + '20', borderColor: Colors.success + '60' },
  optionIndicatorWrong:   { backgroundColor: Colors.error + '20', borderColor: Colors.error + '60' },
  optionIndicatorText:   { color: Colors.textMuted, fontSize: 12, fontWeight: Typography.weight.bold },
  practiceOptionText:    { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20, flex: 1 },
  practiceCorrectText:   { color: Colors.successLight, fontWeight: Typography.weight.bold },
  practiceWrongText:     { color: Colors.errorLight },
  practiceCheckBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  practiceCheckBtnText: {
    color: Colors.white,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  practiceExplain:       { backgroundColor: Colors.infoMuted, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.info + '30', gap: 4 },
  practiceExplainLabel:  { color: Colors.info, fontSize: Typography.size.xs, fontWeight: Typography.weight.black },
  practiceExplainText:   { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },

  // Quiz list
  listSection: { gap: Spacing.md },
  listHeaderRow: { gap: Spacing.xs },
  listLabel:   { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.weight.black, letterSpacing: 1.5 },
  moduleBadgePill: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  moduleBadgePillText: {
    fontSize: Typography.size['2xs'],
    fontWeight: Typography.weight.bold,
  },
  quizCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'], borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  quizIconWrap: {
    width: 48, height: 48, borderRadius: Radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  quizIcon:    { fontSize: 22 },
  quizBody:    { flex: 1, gap: 6 },
  quizTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  quizTitle:   { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black, flex: 1 },
  quizChevron: { color: Colors.primaryLight, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold },
  quizDesc:    { color: Colors.textMuted, fontSize: Typography.size.sm },
  quizMeta:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  quizMetaItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  quizMetaIcon:{ fontSize: 12 },
  quizMetaText:{ color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  quizActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  quizEditBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.infoMuted, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.info + '30',
  },
  quizEditText:  { color: Colors.info, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  quizDeleteBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.errorMuted, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.error + '30',
  },
  quizDeleteText:{ color: Colors.error, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
});
