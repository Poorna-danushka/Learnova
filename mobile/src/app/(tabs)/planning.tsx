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
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  completeStudyGoal,
  completeStudySession,
  createStudyGoal,
  createStudySession,
  deleteStudyGoal,
  deleteStudySession,
  getStudyGoals,
  getStudySessions,
  StudyGoal,
  StudySession,
} from '@/services/api/planningApi';
import { getModules, Module as Subject } from '@/services/api/moduleApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import {
  Badge, Button, Chip, EmptyState, Field,
  Message, ProgressBar, SegmentedControl, SkeletonCard,
} from '@/components/ui';
import {
  deleteSavedStudyPlan, generateStudyPlan, getSavedStudyPlans,
  parseAIError, isAuthError, type AIErrorKind,
} from '@/services/api/aiApi';
import { AIPlanCard } from '@/components/AIPlanCard';
import { StudyPlanContent } from '@/components/StudyPlanContent';
import type { StudyPlanResponse } from '@/types/ai';

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date(); const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === tomorrow.toDateString())  return 'Tomorrow';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function defaultFor() {
  const d = new Date(); d.setMinutes(d.getMinutes() + 30); return d;
}

export default function PlanningScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { module_id } = useLocalSearchParams<{ module_id?: string }>();
  const [tab, setTab]           = useState('Sessions');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals]       = useState<StudyGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionTitle, setSessionTitle]       = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [sessionFor, setSessionFor]           = useState(defaultFor);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [addingSession, setAddingSession]     = useState(false);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle]       = useState('');
  const [addingGoal, setAddingGoal]     = useState(false);

  // AI Plan
  const [aiSubjectIds, setAiSubjectIds]       = useState<number[]>([]);
  const [aiDays, setAiDays]                   = useState('7');
  const [aiMinutes, setAiMinutes]             = useState('60');
  const [aiPriorities, setAiPriorities]       = useState('');
  const [generating, setGenerating]           = useState(false);
  const [plan, setPlan]                       = useState<string | null>(null);
  const [planError, setPlanError]             = useState<AIErrorKind | null>(null);
  const [savedPlans, setSavedPlans]           = useState<StudyPlanResponse[]>([]);
  const [expandedPlanId, setExpandedPlanId]   = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [s, g, sub, saved] = await Promise.all([
        getStudySessions(), getStudyGoals(), getModules(), getSavedStudyPlans(),
      ]);
      setSessions(s); setGoals(g); setSubjects(sub); setSavedPlans(saved);
      if (!subjectId && sub.length) setSubjectId(sub[0].id);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) signOut();
      else setError('Unable to load planner data.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addSession = async () => {
    if (!sessionTitle.trim()) { setError('Enter a session title.'); return; }
    setAddingSession(true); setError(null);
    try {
      const item = await createStudySession({
        title: sessionTitle.trim(), module_id: subjectId,
        scheduled_for: sessionFor.toISOString(),
        duration_minutes: parseInt(sessionDuration) || 60, is_completed: false,
      });
      setSessions((p) => [item, ...p]);
      setSessionTitle(''); setShowSessionForm(false);
    } catch { setError('Unable to create session.'); }
    finally { setAddingSession(false); }
  };

  const addGoal = async () => {
    if (!goalTitle.trim()) { setError('Enter a goal title.'); return; }
    setAddingGoal(true); setError(null);
    try {
      const item = await createStudyGoal({ title: goalTitle.trim(), module_id: subjectId, is_completed: false });
      setGoals((p) => [item, ...p]);
      setGoalTitle(''); setShowGoalForm(false);
    } catch { setError('Unable to create goal.'); }
    finally { setAddingGoal(false); }
  };

  const completeSession = async (id: number) => {
    try { setSessions((p) => p.map((i) => (i.id === id ? { ...i, is_completed: true } : i)));
      const updated = await completeStudySession(id);
      setSessions((p) => p.map((i) => (i.id === id ? updated : i)));
    } catch { setError('Unable to complete session.'); }
  };

  const completeGoal = async (id: number) => {
    try { setGoals((p) => p.map((i) => (i.id === id ? { ...i, is_completed: true } : i)));
      const updated = await completeStudyGoal(id);
      setGoals((p) => p.map((i) => (i.id === id ? updated : i)));
    } catch { setError('Unable to complete goal.'); }
  };

  const doDelete = (kind: 'session' | 'goal', id: number) => {
    const remove = async () => {
      try {
        if (kind === 'session') { await deleteStudySession(id); setSessions((p) => p.filter((i) => i.id !== id)); }
        else { await deleteStudyGoal(id); setGoals((p) => p.filter((i) => i.id !== id)); }
      } catch (err) {
        if (isAuthError(err)) signOut(); else setError('Unable to delete item.');
      }
    };
    if (Platform.OS === 'web') { void remove(); return; }
    Alert.alert(kind === 'session' ? 'Delete session?' : 'Delete goal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const toggleAISubject = (id: number) =>
    setAiSubjectIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const generatePlan = async () => {
    if (generating) return;
    const days = parseInt(aiDays, 10);
    const mins = parseInt(aiMinutes, 10);
    if (!Number.isFinite(days) || days < 1 || days > 30) { setError('Days must be 1–30.'); return; }
    if (!Number.isFinite(mins) || mins < 15 || mins > 480) { setError('Minutes/day must be 15–480.'); return; }
    setGenerating(true); setPlan(null); setPlanError(null); setError(null);
    try {
      const result = await generateStudyPlan({
        module_ids: aiSubjectIds.length > 0 ? aiSubjectIds : [],
        days, minutes_per_day: mins,
        priorities: aiPriorities.trim() || undefined,
      });
      setPlan(result.plan);
      setSavedPlans((p) => [result, ...p.filter((x) => x.id !== result.id)]);
    } catch (err) {
      if (isAuthError(err)) { signOut(); return; }
      setPlanError(parseAIError(err));
    } finally { setGenerating(false); }
  };

  const subjectName = (id?: number) => subjects.find((s) => s.id === id)?.name ?? 'General';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.pageTitle}>📅 Planner</Text>
            <Text style={s.pageSubtitle}>
              {loading ? 'Loading…' : `${sessions.length + goals.length} item${sessions.length + goals.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/calendar')}
            style={({ pressed }) => [s.calBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
            accessibilityRole="button"
          >
            <Text style={s.calIcon}>📆</Text>
            <Text style={s.calLabel}>Calendar</Text>
          </Pressable>
        </View>

        {/* Stats Card */}
        {!loading && (sessions.length > 0 || goals.length > 0) && (
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
                <Text style={s.statIcon}>📚</Text>
              </View>
              <View>
                <Text style={s.statValue}>{sessions.length}</Text>
                <Text style={s.statLabel}>Sessions</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '30' }]}>
                <Text style={s.statIcon}>🎯</Text>
              </View>
              <View>
                <Text style={s.statValue}>{goals.length}</Text>
                <Text style={s.statLabel}>Goals</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '30' }]}>
                <Text style={s.statIcon}>✓</Text>
              </View>
              <View>
                <Text style={s.statValue}>
                  {sessions.filter(s => s.is_completed).length + goals.filter(g => g.is_completed).length}
                </Text>
                <Text style={s.statLabel}>Done</Text>
              </View>
            </View>
          </View>
        )}

        <View style={s.tabWrap}>
          <SegmentedControl options={['Sessions', 'Goals', 'AI Plan']} selected={tab} onSelect={setTab} />
        </View>

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
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={Colors.primaryLight} />
            }
          >
          {error && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}

          {/* ── Sessions ── */}
          {tab === 'Sessions' && (
            <>
              <Pressable
                onPress={() => setShowSessionForm((v) => !v)}
                style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              >
                <Text style={s.addBtnIcon}>{showSessionForm ? '−' : '+'}</Text>
                <Text style={s.addBtnText}>New Study Session</Text>
              </Pressable>

              <Modal
                visible={showSessionForm}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSessionForm(false)}
              >
                <KeyboardAvoidingView
                  style={s.modalOverlay}
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                  <Pressable style={s.modalBackdrop} onPress={() => setShowSessionForm(false)} />
                  <View style={s.modalCard}>
                    <View style={s.modalTitleRow}>
                      <Text style={s.formTitle}>📚 New Session</Text>
                      <Pressable
                        onPress={() => setShowSessionForm(false)}
                        hitSlop={10}
                        style={s.modalCloseBtn}
                        accessibilityRole="button"
                      >
                        <Text style={s.modalCloseText}>✕</Text>
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScrollContent}>
                      <Text style={s.formFieldLabel}>Module</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                        {subjects.map((sub) => (
                          <Chip key={sub.id} label={sub.name} active={subjectId === sub.id} onPress={() => setSubjectId(sub.id)} color={sub.color} />
                        ))}
                      </ScrollView>
                      <Field label="Title" placeholder="e.g. Review lecture notes" value={sessionTitle} onChangeText={setSessionTitle} returnKeyType="done" />
                      <View style={s.dateRow}>
                        <Pressable style={s.datePill} onPress={() => setShowDatePicker(true)}>
                          <Text style={s.datePillLabel}>📅 Date</Text>
                          <Text style={s.datePillValue}>{sessionFor.toLocaleDateString()}</Text>
                        </Pressable>
                        <Pressable style={s.datePill} onPress={() => setShowTimePicker(true)}>
                          <Text style={s.datePillLabel}>🕐 Time</Text>
                          <Text style={s.datePillValue}>{sessionFor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </Pressable>
                      </View>
                      {showDatePicker && (
                        <DateTimePicker value={sessionFor} mode="date" minimumDate={new Date()}
                          onChange={(_, v) => { setShowDatePicker(false); if (v) setSessionFor((c) => { const n = new Date(c); n.setFullYear(v.getFullYear(), v.getMonth(), v.getDate()); return n; }); }} />
                      )}
                      {showTimePicker && (
                        <DateTimePicker value={sessionFor} mode="time"
                          onChange={(_, v) => { setShowTimePicker(false); if (v) setSessionFor((c) => { const n = new Date(c); n.setHours(v.getHours(), v.getMinutes()); return n; }); }} />
                      )}
                      <Field label="Duration (minutes)" placeholder="60" keyboardType="numeric" value={sessionDuration} onChangeText={setSessionDuration} returnKeyType="done" />
                    </ScrollView>

                    <View style={s.formActions}>
                      <Button label="Cancel" onPress={() => setShowSessionForm(false)} variant="ghost" size="sm" fullWidth={false} />
                      <Button label="Add Session" onPress={addSession} loading={addingSession} size="sm" fullWidth={false} />
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </Modal>

              {loading
                ? <><SkeletonCard /><SkeletonCard /></>
                : sessions.length === 0
                  ? <EmptyState icon="📚" title="No sessions yet" text="Plan your first study session." action="Add Session" onAction={() => setShowSessionForm(true)} />
                  : sessions.map((item, idx) => (
                    <Animated.View 
                      key={item.id} 
                      style={[
                        s.sessionCard, 
                        item.is_completed && s.itemDone,
                        {
                          opacity: fadeAnim,
                          transform: [
                            { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                            { scale: scaleAnim },
                          ],
                        }
                      ]}
                    >
                      <View style={[s.sessionAccent, { backgroundColor: item.is_completed ? Colors.success : Colors.primary }]} />
                      <View style={s.sessionBody}>
                        <View style={s.sessionTop}>
                          <View style={[s.sessionIconWrap, { backgroundColor: item.is_completed ? Colors.success + '15' : Colors.primary + '15', borderColor: item.is_completed ? Colors.success + '30' : Colors.primary + '30' }]}>
                            <Text style={s.sessionIcon}>📚</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.sessionTitle, item.is_completed && s.doneText]} numberOfLines={2}>{item.title}</Text>
                            <Text style={s.sessionMeta}>{subjectName(item.module_id)} · {item.duration_minutes} min</Text>
                          </View>
                          <Badge label={item.is_completed ? 'Done' : 'Upcoming'} color={item.is_completed ? Colors.success : Colors.primary} size="xs" />
                        </View>
                        <View style={s.sessionTimeBox}>
                          <View style={s.sessionTimeItem}>
                            <Text style={s.sessionTimeIcon}>🗓️</Text>
                            <Text style={s.sessionDate}>{fmtDate(item.scheduled_for)}</Text>
                          </View>
                          <View style={s.sessionTimeItem}>
                            <Text style={s.sessionTimeIcon}>🕐</Text>
                            <Text style={s.sessionTime}>{fmtTime(item.scheduled_for)}</Text>
                          </View>
                        </View>
                        <View style={s.itemActions}>
                          {!item.is_completed && (
                            <Pressable 
                              onPress={() => void completeSession(item.id)} 
                              hitSlop={8}
                              style={({ pressed }) => [s.completeBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
                            >
                              <Text style={s.completeBtnText}>✓ Mark Done</Text>
                            </Pressable>
                          )}
                          <Pressable 
                            onPress={() => doDelete('session', item.id)} 
                            hitSlop={8}
                            style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
                          >
                            <Text style={s.deleteBtnText}>✕ Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    </Animated.View>
                  ))
              }
            </>
          )}

          {/* ── Goals ── */}
          {tab === 'Goals' && (
            <>
              <Pressable
                onPress={() => setShowGoalForm((v) => !v)}
                style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              >
                <Text style={s.addBtnIcon}>{showGoalForm ? '−' : '+'}</Text>
                <Text style={s.addBtnText}>New Goal</Text>
              </Pressable>

              <Modal
                visible={showGoalForm}
                transparent
                animationType="fade"
                onRequestClose={() => setShowGoalForm(false)}
              >
                <KeyboardAvoidingView
                  style={s.modalOverlay}
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                  <Pressable style={s.modalBackdrop} onPress={() => setShowGoalForm(false)} />
                  <View style={s.modalCard}>
                    <View style={s.modalTitleRow}>
                      <Text style={s.formTitle}>🎯 New Goal</Text>
                      <Pressable
                        onPress={() => setShowGoalForm(false)}
                        hitSlop={10}
                        style={s.modalCloseBtn}
                        accessibilityRole="button"
                      >
                        <Text style={s.modalCloseText}>✕</Text>
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScrollContent}>
                      <Text style={s.formFieldLabel}>Module</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                        {subjects.map((sub) => (
                          <Chip key={sub.id} label={sub.name} active={subjectId === sub.id} onPress={() => setSubjectId(sub.id)} color={sub.color} />
                        ))}
                      </ScrollView>
                      <Field label="Goal title" placeholder="e.g. Finish Chapter 5" value={goalTitle} onChangeText={setGoalTitle} returnKeyType="done" />
                    </ScrollView>

                    <View style={s.formActions}>
                      <Button label="Cancel" onPress={() => setShowGoalForm(false)} variant="ghost" size="sm" fullWidth={false} />
                      <Button label="Add Goal" onPress={addGoal} loading={addingGoal} size="sm" fullWidth={false} />
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </Modal>

              {loading
                ? <><SkeletonCard /><SkeletonCard /></>
                : goals.length === 0
                  ? <EmptyState icon="🎯" title="No goals yet" text="Set your first study goal." action="Add Goal" onAction={() => setShowGoalForm(true)} />
                  : goals.map((item, idx) => (
                    <Animated.View 
                      key={item.id} 
                      style={[
                        s.goalCard, 
                        item.is_completed && s.itemDone,
                        {
                          opacity: fadeAnim,
                          transform: [
                            { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                            { scale: scaleAnim },
                          ],
                        }
                      ]}
                    >
                      <View style={s.goalTop}>
                        <View style={[s.goalIconWrap, { backgroundColor: item.is_completed ? Colors.success + '15' : Colors.warning + '15', borderColor: item.is_completed ? Colors.success + '30' : Colors.warning + '30' }]}>
                          <Text style={s.goalIcon}>🎯</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.goalTitle, item.is_completed && s.doneText]} numberOfLines={2}>{item.title}</Text>
                          <Text style={s.goalSubject}>{subjectName(item.module_id)}</Text>
                        </View>
                        <Badge label={item.is_completed ? 'Done' : 'Active'} color={item.is_completed ? Colors.success : Colors.warning} size="xs" />
                      </View>
                      <ProgressBar progress={item.is_completed ? 100 : 40} color={item.is_completed ? Colors.success : Colors.warning} height={6} style={{ marginTop: Spacing.xs }} />
                      <View style={s.itemActions}>
                        {!item.is_completed && (
                          <Pressable 
                            onPress={() => void completeGoal(item.id)} 
                            hitSlop={8}
                            style={({ pressed }) => [s.completeBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
                          >
                            <Text style={s.completeBtnText}>✓ Complete</Text>
                          </Pressable>
                        )}
                        <Pressable 
                          onPress={() => doDelete('goal', item.id)} 
                          hitSlop={8}
                          style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
                        >
                          <Text style={s.deleteBtnText}>✕ Delete</Text>
                        </Pressable>
                      </View>
                    </Animated.View>
                  ))
              }
            </>
          )}

          {/* ── AI Plan ── */}
          {tab === 'AI Plan' && (
            <View style={s.aiTab}>
              <View style={s.aiIntro}>
                <View style={s.aiIntroIcon}><Text style={{ color: Colors.primaryLight, fontSize: 20 }}>✨</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.aiIntroTitle}>Generate a Study Plan</Text>
                  <Text style={s.aiIntroText}>AI will build a personalized plan based on your modules and schedule.</Text>
                </View>
              </View>

              <View style={s.aiFormCard}>
                <Text style={s.formFieldLabel}>Modules (empty = all)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                  {subjects.map((sub) => (
                    <Chip key={sub.id} label={sub.name} active={aiSubjectIds.includes(sub.id)} onPress={() => toggleAISubject(sub.id)} color={sub.color} />
                  ))}
                </ScrollView>
                {subjects.length === 0 && <Text style={s.emptyHint}>No modules yet.</Text>}

                <View style={s.aiParamRow}>
                  <View style={{ flex: 1 }}>
                    <Field label="Days (1–30)" value={aiDays} onChangeText={setAiDays} keyboardType="numeric" placeholder="7" returnKeyType="done" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Min/day (15–480)" value={aiMinutes} onChangeText={setAiMinutes} keyboardType="numeric" placeholder="60" returnKeyType="done" />
                  </View>
                </View>

                <Field label="Priorities (optional)" value={aiPriorities} onChangeText={setAiPriorities} placeholder="e.g. Focus on calculus, exam on Friday" multiline />

                <Button label={generating ? 'Generating Plan…' : '✨  Generate Plan'} onPress={generatePlan} loading={generating} disabled={generating} />
              </View>

              <AIPlanCard
                plan={plan} loading={generating} error={planError}
                onDismiss={() => { setPlan(null); setPlanError(null); }}
                onRetry={generatePlan}
              />

              {savedPlans.length > 0 && (
                <View style={s.savedSection}>
                  <Text style={s.savedSectionTitle}>📋 Saved Plans</Text>
                  {savedPlans.map((sp) => (
                    <View key={sp.id} style={s.savedCard}>
                      <View style={s.savedHeader}>
                        <Text style={s.savedTitle} numberOfLines={1}>{sp.title ?? 'AI Study Plan'}</Text>
                        <Pressable
                          onPress={() => {
                            if (!sp.id) return;
                            void deleteSavedStudyPlan(sp.id)
                              .then(() => setSavedPlans((p) => p.filter((x) => x.id !== sp.id)))
                              .catch((err) => { if (isAuthError(err)) signOut(); else setError('Failed to delete plan.'); });
                          }}
                          hitSlop={8}
                          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                        >
                          <Text style={s.deleteText}>✕ Delete</Text>
                        </Pressable>
                      </View>
                      <Text style={s.savedMeta}>{sp.days ?? 0} days · {sp.minutes_per_day ?? 0} min/day</Text>
                      <StudyPlanContent plan={sp.plan} compact={expandedPlanId !== sp.id} />
                      <Pressable
                        onPress={() => setExpandedPlanId((c) => (c === sp.id ? null : (sp.id ?? null)))}
                        hitSlop={8}
                        style={({ pressed }) => [s.viewPlanBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={s.viewPlanText}>
                          {expandedPlanId === sp.id ? 'Show less ↑' : 'View full plan →'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.sm,
  },
  pageTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  pageSubtitle:{ color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: 2 },
  calBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Shadow.md,
  },
  calIcon:  { fontSize: 16 },
  calLabel: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.md,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: { fontSize: 18 },
  statValue: { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  statLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: -2 },
  statDivider: { width: 1, backgroundColor: Colors.border },

  tabWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  scroll:  { paddingHorizontal: Spacing.lg, paddingBottom: 200, gap: Spacing.md },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.xl, borderWidth: 1,
    borderColor: Colors.primary + '40', borderStyle: 'dashed',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  addBtnIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  addBtnText: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  // Modal Form
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.lg,
    zIndex: 1001,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: Typography.weight.bold,
  },
  modalScrollContent: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },

  // Form card
  formCard: {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.md,
  },
  formTitle:       { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  formFieldLabel:  { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  chipRow:         { gap: Spacing.sm, paddingVertical: Spacing.xs },
  formActions:     { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  dateRow:         { flexDirection: 'row', gap: Spacing.md },
  datePill: {
    flex: 1, gap: 4, padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  datePillLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.weight.bold },
  datePillValue: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // Session card
  sessionCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'], borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sessionAccent: { width: 5 },
  sessionBody:   { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
  sessionTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  sessionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionIcon:   { fontSize: 20 },
  sessionTitle:  { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  sessionMeta:   { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  sessionTimeBox:{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs },
  sessionTimeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionTimeIcon: { fontSize: 14 },
  sessionDate:   { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  sessionTime:   { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  // Goal card
  goalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  goalTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  goalIcon:   { fontSize: 20 },
  goalTitle:  { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  goalSubject:{ color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },

  // Shared
  itemDone:    { opacity: 0.6 },
  doneText:    { textDecorationLine: 'line-through', color: Colors.textMuted },
  itemActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  completeBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.successMuted, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.success + '40',
  },
  completeBtnText:{ color: Colors.success, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  deleteBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.errorMuted, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.error + '35',
    marginLeft: 'auto',
  },
  deleteBtnText:  { color: Colors.error, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  deleteText:  { color: Colors.error, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // AI Plan tab
  aiTab:     { gap: Spacing.md },
  aiIntro:   {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primarySubtle, borderRadius: Radius['2xl'], borderWidth: 1,
    borderColor: Colors.primaryMuted, padding: Spacing.lg,
  },
  aiIntroIcon: {
    width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: Colors.primary + '20',
    borderWidth: 1, borderColor: Colors.primary + '40', alignItems: 'center', justifyContent: 'center',
  },
  aiIntroTitle:{ color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black },
  aiIntroText: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20, marginTop: 4 },
  aiFormCard:  {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.md,
  },
  aiParamRow:  { flexDirection: 'row', gap: Spacing.md },
  emptyHint:   { color: Colors.textMuted, fontSize: Typography.size.xs, fontStyle: 'italic' },

  // Saved plans
  savedSection:     { gap: Spacing.md },
  savedSectionTitle:{ color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  savedCard: {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm,
    ...Shadow.sm,
  },
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  savedTitle:  { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, flex: 1 },
  savedMeta:   { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  viewPlanBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.xs },
  viewPlanText:{ color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
});
