import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser, UserRegisterResponse } from '@/services/api/userApi';
import { getStudyGoals, getStudySessions, StudyGoal, StudySession } from '@/services/api/planningApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import {
  Avatar,
  BottomNav,
  ProgressBar,
  SkeletonCard,
  SkeletonLine,
} from '@/components/ui';
import { getModules, Module } from '@/services/api/moduleApi';
import { ModuleSelectorModal } from '@/components/ModuleSelectorModal';
import { MODULE_ROUTES } from '@/constants/routes';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingEmoji() {
  const h = new Date().getHours();
  if (h < 12) return '🌅';
  if (h < 17) return '☀️';
  return '🌙';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

const QUICK_ACTIONS = [
  { label: 'AI',      icon: '✦', route: '/ai',        color: '#06B6D4' },
  { label: 'Note',    icon: '✎', route: '/notes/new', color: Colors.primary },
  { label: 'Session', icon: '▶', route: '/planning',  color: '#7C3AED' },
  { label: 'Goal',    icon: '◆', route: '/planning',  color: '#0D9488' },
  { label: 'Event',   icon: '☆', route: '/calendar',  color: '#D97706' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [user, setUser]         = useState<UserRegisterResponse | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals]       = useState<StudyGoal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [showModuleSelector, setShowModuleSelector] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [statAnimValues] = useState(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      statAnimValues.forEach((anim, i) => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          delay: i * 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [loading, statAnimValues]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [u, s, g, m] = await Promise.all([
        getCurrentUser(),
        getStudySessions(),
        getStudyGoals(),
        getModules(),
      ]);
      setUser(u);
      setSessions(s);
      setGoals(g);
      setModules(m);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) signOut();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const upcoming    = sessions.filter((s) => !s.is_completed);
  const completed   = sessions.filter((s) => s.is_completed);
  const activeGoals = goals.filter((g) => !g.is_completed);
  const nextSession = upcoming[0] ?? null;
  const firstName   = user?.full_name?.split(' ')[0] ?? 'there';
  const isNewUser   = !loading && modules.length === 0;

  const totalItems = sessions.length + goals.length;
  const doneItems  = completed.length + goals.filter((g) => g.is_completed).length;
  const completionPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/* Decorative background blobs */}
      <View style={styles.blobGreen}  pointerEvents="none" />
      <View style={styles.blobPink}   pointerEvents="none" />
      <View style={styles.blobTeal}   pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >

          {/* ── Header ── */}
          <Animated.View
            style={[styles.topRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.greetBlock}>
              <View style={styles.greetRow}>
                <Text style={styles.greetingEmoji}>{getGreetingEmoji()}</Text>
                <Text style={styles.greeting}>{getGreeting()}</Text>
              </View>
              {loading
                ? <SkeletonLine width={160} height={30} style={{ borderRadius: Radius.sm }} />
                : <Text style={styles.userName}>{firstName}</Text>
              }
            </View>

            <View style={styles.headerRight}>
              {/* Quick Notification Bell */}
              <Pressable
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => [styles.notifBellBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Text style={styles.notifBellIcon}>🔔</Text>
              </Pressable>

              {/* Profile Avatar */}
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                style={({ pressed }) => pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }}
              >
                {loading
                  ? <View style={styles.avatarSkeleton} />
                  : <Avatar name={user?.full_name ?? '?'} size={44} />
                }
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Today's Momentum Card ── */}
          {loading ? <SkeletonCard /> : (
            <Animated.View
              style={[
                styles.todayCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.todayHeaderRow}>
                <Text style={styles.todayLabel}>TODAY'S MOMENTUM</Text>
                <View style={styles.momentumBadge}>
                  <Text style={styles.momentumText}>{completionPct}% Done</Text>
                </View>
              </View>

              {totalItems > 0 && (
                <View style={{ marginBottom: Spacing.md }}>
                  <ProgressBar progress={completionPct} color={Colors.primary} height={6} />
                </View>
              )}

              <View style={styles.todayStats}>

                {/* Upcoming */}
                <Animated.View
                  style={[
                    styles.todayStat,
                    {
                      opacity: statAnimValues[0],
                      transform: [{ scale: statAnimValues[0].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                    },
                  ]}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: Colors.primarySubtle, borderColor: Colors.primaryMuted }]}>
                    <Text style={styles.statIcon}>📚</Text>
                  </View>
                  <Text style={[styles.todayNum, { color: Colors.primary }]}>{upcoming.length}</Text>
                  <Text style={styles.todayStatLabel}>Upcoming</Text>
                </Animated.View>

                <View style={styles.todayDivider} />

                {/* Completed */}
                <Animated.View
                  style={[
                    styles.todayStat,
                    {
                      opacity: statAnimValues[1],
                      transform: [{ scale: statAnimValues[1].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                    },
                  ]}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: Colors.successMuted, borderColor: Colors.success + '30' }]}>
                    <Text style={styles.statIcon}>✓</Text>
                  </View>
                  <Text style={[styles.todayNum, { color: Colors.success }]}>{completed.length}</Text>
                  <Text style={styles.todayStatLabel}>Completed</Text>
                </Animated.View>

                <View style={styles.todayDivider} />

                {/* Goals */}
                <Animated.View
                  style={[
                    styles.todayStat,
                    {
                      opacity: statAnimValues[2],
                      transform: [{ scale: statAnimValues[2].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                    },
                  ]}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: Colors.warningMuted, borderColor: Colors.warning + '30' }]}>
                    <Text style={styles.statIcon}>🎯</Text>
                  </View>
                  <Text style={[styles.todayNum, { color: Colors.warning }]}>{activeGoals.length}</Text>
                  <Text style={styles.todayStatLabel}>Goals</Text>
                </Animated.View>

              </View>
            </Animated.View>
          )}

          {/* ── Quick Actions ── */}
          <View>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.label}
                  style={({ pressed }) => [
                    styles.quickItem,
                    { borderColor: action.color + '30' },
                    pressed && { opacity: 0.72, transform: [{ scale: 0.94 }] },
                  ]}
                  onPress={() => {
                    if (action.label === 'Note') {
                      setShowModuleSelector(true);
                    } else {
                      router.push(action.route as never);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={[styles.quickIcon, { backgroundColor: action.color + '15', borderColor: action.color + '35' }]}>
                    <Text style={[styles.quickIconText, { color: action.color }]}>{action.icon}</Text>
                  </View>
                  <Text style={[styles.quickLabel, { color: action.color }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── My Modules Section (For users with modules) ── */}
          {!loading && modules.length > 0 && (
            <View>
              <View style={styles.sectionRow}>
                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionTitleEmoji}>📚</Text>
                  <Text style={styles.sectionLabel}>My Modules</Text>
                </View>
                <Pressable onPress={() => router.push('/modules')} hitSlop={8}>
                  <Text style={styles.seeAll}>Manage ({modules.length}) →</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleScroll}>
                {modules.map((mod) => (
                  <Pressable
                    key={mod.id}
                    style={({ pressed }) => [
                      styles.moduleCardPill,
                      { borderLeftColor: mod.color || Colors.primary },
                      pressed && { opacity: 0.84, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => router.push({ pathname: '/modules/[id]', params: { id: String(mod.id) } })}
                  >
                    <View style={[styles.moduleIconCircle, { backgroundColor: (mod.color || Colors.primary) + '18' }]}>
                      <Text style={styles.moduleIconEmoji}>📚</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleCardName} numberOfLines={1}>{mod.name}</Text>
                      <Text style={styles.moduleCardDesc} numberOfLines={1}>
                        {mod.description || 'Module Content'}
                      </Text>
                    </View>
                    <View style={[styles.moduleArrowWrap, { backgroundColor: (mod.color || Colors.primary) + '15' }]}>
                      <Text style={[styles.moduleArrow, { color: mod.color || Colors.primary }]}>→</Text>
                    </View>
                  </Pressable>
                ))}
                {/* Add Module Pill */}
                <Pressable
                  style={({ pressed }) => [styles.addModulePill, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/modules')}
                >
                  <Text style={styles.addModulePlus}>+</Text>
                  <Text style={styles.addModuleText}>Add Module</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {/* ── AI Study Hub Spotlight (For users with modules) ── */}
          {!loading && modules.length > 0 && (
            <View style={styles.aiHubCard}>
              <View style={styles.aiHubHeader}>
                <View style={styles.aiHubIconCircle}>
                  <Text style={styles.aiHubEmoji}>✨</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiHubTitle}>Learnova AI Assistant</Text>
                  <Text style={styles.aiHubSub}>Generate quizzes, study plans & summaries</Text>
                </View>
              </View>
              <View style={styles.aiHubActions}>
                <Pressable
                  style={({ pressed }) => [styles.aiHubPill, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/quizzes')}
                >
                  <Text style={styles.aiHubPillIcon}>🎯</Text>
                  <Text style={styles.aiHubPillText}>AI Quiz</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.aiHubPill, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/planning')}
                >
                  <Text style={styles.aiHubPillIcon}>📅</Text>
                  <Text style={styles.aiHubPillText}>AI Plan</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.aiHubPill, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/materials')}
                >
                  <Text style={styles.aiHubPillIcon}>📄</Text>
                  <Text style={styles.aiHubPillText}>Ask File</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.aiHubPill, styles.aiHubPillPrimary, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/ai')}
                >
                  <Text style={styles.aiHubPillIcon}>💬</Text>
                  <Text style={styles.aiHubPillTextPrimary}>Chat AI</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Next Up ── */}
          <View>
            <Text style={styles.sectionLabel}>Next Up</Text>
            {loading ? <SkeletonCard /> : nextSession ? (
              <Pressable
                style={({ pressed }) => [styles.nextCard, pressed && { opacity: 0.86, transform: [{ scale: 0.99 }] }]}
                onPress={() => router.push('/planning')}
                accessibilityRole="button"
                accessibilityLabel={`Open session: ${nextSession.title}`}
              >
                <View style={styles.nextAccent} />
                <View style={styles.nextBody}>
                  <View style={styles.nextHeader}>
                    <Text style={styles.nextTitle} numberOfLines={2}>{nextSession.title}</Text>
                    <View style={styles.nextTimeBadge}>
                      <Text style={styles.nextTime}>{formatTime(nextSession.scheduled_for)}</Text>
                    </View>
                  </View>
                  <Text style={styles.nextMeta}>
                    {formatDate(nextSession.scheduled_for)} · {nextSession.duration_minutes} min
                  </Text>
                  <View style={styles.nextFooter}>
                    <View style={styles.nextCategoryPill}>
                      <Text style={styles.nextCategoryText}>Study Session</Text>
                    </View>
                    <Text style={styles.nextChevron}>→</Text>
                  </View>
                </View>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.nextEmpty, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/planning')}
                accessibilityRole="button"
              >
                <View style={styles.emptyIconWrap}>
                  <Text style={styles.nextEmptyIcon}>📅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextEmptyTitle}>Nothing scheduled</Text>
                  <Text style={styles.nextEmptyText}>Add a session to stay on track</Text>
                </View>
                <View style={styles.nextEmptyArrowWrap}>
                  <Text style={styles.nextEmptyArrow}>→</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* ── Active Goals ── */}
          {(loading || activeGoals.length > 0) && (
            <View>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>Active Goals</Text>
                <Pressable onPress={() => router.push('/planning')} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.seeAll}>See all →</Text>
                </Pressable>
              </View>
              {loading
                ? <><SkeletonCard /><SkeletonCard /></>
                : activeGoals.slice(0, 3).map((goal) => (
                  <Pressable
                    key={goal.id}
                    style={({ pressed }) => [styles.goalCard, pressed && { opacity: 0.86 }]}
                    onPress={() => router.push('/planning')}
                    accessibilityRole="button"
                  >
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIconWrap}>
                        <Text style={styles.goalIcon}>🎯</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                        <Text style={styles.goalPct}>40% complete</Text>
                      </View>
                    </View>
                    <ProgressBar progress={40} color={Colors.primary} height={5} />
                  </Pressable>
                ))
              }
            </View>
          )}

          {/* ── Onboarding Card (Only for first signup before creating any module) ── */}
          {isNewUser && (
            <View style={styles.onboardCard}>
              <View style={styles.onboardHeader}>
                <View style={styles.onboardIconWrap}>
                  <Text style={styles.onboardIcon}>🚀</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardTitle}>Let's get started!</Text>
                  <Text style={styles.onboardSubtitle}>Complete these steps to unlock full features</Text>
                </View>
              </View>

              {[
                { label: 'Create your account',          done: true  },
                { label: 'Add your first module',         done: false },
                { label: 'Upload a note or material',     done: false },
                { label: 'Plan your first study session', done: false },
              ].map((step, i) => (
                <View key={i} style={styles.onboardStep}>
                  <View style={[styles.onboardDot, step.done && styles.onboardDotDone]}>
                    {step.done
                      ? <Text style={styles.onboardCheck}>✓</Text>
                      : <Text style={styles.onboardNum}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.onboardStepText, step.done && styles.onboardStepDone]}>
                    {step.label}
                  </Text>
                </View>
              ))}

              <Pressable
                style={({ pressed }) => [styles.onboardCta, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push('/modules')}
                accessibilityRole="button"
              >
                <Text style={styles.onboardCtaText}>Create First Module</Text>
                <Text style={styles.onboardCtaArrow}>→</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      <ModuleSelectorModal
        visible={showModuleSelector}
        modules={modules}
        onSelect={(moduleId) => router.push(MODULE_ROUTES.notesForModule(moduleId) as any)}
        onCreateModule={() => router.push('/modules')}
        onClose={() => setShowModuleSelector(false)}
        title="Select Module for Note"
      />

      <BottomNav active="Home" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // ── Background blobs ─────────────────────────────────────────────────────────
  blobGreen: {
    position: 'absolute',
    top: -50,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.success + '12',   // #16A34A at ~7% opacity
  },
  blobPink: {
    position: 'absolute',
    top: 120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#BE185D' + '0E',        // pink from moduleColors palette
  },
  blobTeal: {
    position: 'absolute',
    bottom: 200,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primary + '0A',   // teal brand at ~4% opacity
  },

  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.xl,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  topRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetBlock:     { gap: 3 },
  greetRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greetingEmoji:  { fontSize: 14 },
  greeting:       {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.4,
  },
  userName:       {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    lineHeight: 34,
  },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notifBellBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.xs,
  },
  notifBellIcon:  { fontSize: 18 },
  avatarSkeleton: { width: 44, height: 44, borderRadius: Radius.xl, backgroundColor: Colors.surfaceElevated },

  // ── Today Momentum card ───────────────────────────────────────────────────────
  todayCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadow.glow,
  },
  todayHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  todayLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size['2xs'],
    fontWeight: Typography.weight.black,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  momentumBadge: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  momentumText: { color: Colors.primary, fontSize: Typography.size['2xs'], fontWeight: Typography.weight.bold },
  todayStats:     { flexDirection: 'row', alignItems: 'center' },
  todayStat:      { flex: 1, alignItems: 'center', gap: 6 },
  statIconWrap:   {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  statIcon:       { fontSize: 20 },
  todayNum:       { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black, lineHeight: 30 },
  todayStatLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  todayDivider:   { width: 1, height: 56, backgroundColor: Colors.border },

  // ── Section labels ───────────────────────────────────────────────────────────
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitleEmoji:{ fontSize: 16 },
  sectionLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAll: { color: Colors.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  // ── Quick actions ────────────────────────────────────────────────────────────
  quickGrid: { flexDirection: 'row', gap: Spacing.sm },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingVertical: Spacing.base,
    ...Shadow.xs,
  },
  quickIcon: {
    width: 42, height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  quickIconText: { fontSize: 18 },
  quickLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.2,
  },

  // ── My Modules Scroll ────────────────────────────────────────────────────────
  moduleScroll: { gap: Spacing.md, paddingRight: Spacing.xs },
  moduleCardPill: {
    width: 210,
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 5,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  moduleIconCircle: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  moduleIconEmoji: { fontSize: 18 },
  moduleCardName: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  moduleCardDesc: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  moduleArrowWrap: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  moduleArrow:    { fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
  addModulePill: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
    borderStyle: 'dashed',
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addModulePlus: { color: Colors.primary, fontSize: 22, fontWeight: Typography.weight.black },
  addModuleText: { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // ── AI Hub Banner ─────────────────────────────────────────────────────────────
  aiHubCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.primary + '35',
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  aiHubHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  aiHubIconCircle: {
    width: 44, height: 44, borderRadius: Radius.xl,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  aiHubEmoji: { fontSize: 22 },
  aiHubTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black },
  aiHubSub:   { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  aiHubActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  aiHubPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '25',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  aiHubPillPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  aiHubPillIcon: { fontSize: 13 },
  aiHubPillText: { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  aiHubPillTextPrimary: { color: Colors.white, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // ── Next session card ────────────────────────────────────────────────────────
  nextCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  nextAccent:       { width: 5, backgroundColor: Colors.primary },
  nextBody:         { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
  nextHeader:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  nextTitle:        { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, flex: 1, lineHeight: 22 },
  nextTimeBadge: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    flexShrink: 0,
  },
  nextTime:         { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.black },
  nextMeta:         { color: Colors.textMuted, fontSize: Typography.size.xs },
  nextFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  nextCategoryPill: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextCategoryText: { color: Colors.textMuted, fontSize: 10, fontWeight: Typography.weight.semibold },
  nextChevron:      { color: Colors.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  // Next empty state
  nextEmpty: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 48, height: 48, borderRadius: Radius.xl,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  nextEmptyIcon:     { fontSize: 22 },
  nextEmptyTitle:    { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  nextEmptyText:     { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  nextEmptyArrowWrap:{
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  nextEmptyArrow:    { color: Colors.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },

  // ── Goals ────────────────────────────────────────────────────────────────────
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadow.xs,
  },
  goalHeader:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  goalIconWrap: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  goalIcon:  { fontSize: 16 },
  goalTitle: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  goalPct:   { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, marginTop: 1 },

  // ── Onboarding card ──────────────────────────────────────────────────────────
  onboardCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.sm,
  },
  onboardHeader:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  onboardIconWrap: {
    width: 48, height: 48, borderRadius: Radius.xl,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1.5, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  onboardIcon:     { fontSize: 24 },
  onboardTitle:    { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  onboardSubtitle: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  onboardStep:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  onboardDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  onboardDotDone:   { backgroundColor: Colors.success, borderColor: Colors.success },
  onboardCheck:     { color: Colors.white, fontSize: 12, fontWeight: Typography.weight.black },
  onboardNum:       { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.weight.bold },
  onboardStepText:  { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, flex: 1 },
  onboardStepDone:  { color: Colors.textDisabled, textDecorationLine: 'line-through' },
  onboardCta: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.glow,
  },
  onboardCtaText:  { color: Colors.white, fontSize: Typography.size.base, fontWeight: Typography.weight.black },
  onboardCtaArrow: { color: Colors.white, fontSize: Typography.size.lg },
});
