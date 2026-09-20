import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Screen, BottomNav, SkeletonCard, EmptyState } from '@/components/ui';
import { getModules, Module } from '@/services/api/moduleApi';
import { getNotes, Note } from '@/services/api/noteApi';
import { getQuizzes, Quiz } from '@/services/api/quizApi';
import { getStudyMaterials, StudyMaterial } from '@/services/api/studyMaterialApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// ─── Module Detail Screen ─────────────────────────────────────────────────────
export default function ModuleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { signOut } = useAuth();

  const [module, setModule] = useState<Module | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const moduleId = Number(id);
      const [modules, allNotes, moduleQuizzes, allMaterials] = await Promise.all([
        getModules(),
        getNotes(),
        getQuizzes(moduleId),
        getStudyMaterials(),
      ]);

      const foundModule = modules.find((m) => m.id === moduleId);
      if (!foundModule) {
        Alert.alert('Error', 'Module not found');
        router.back();
        return;
      }

      setModule(foundModule);
      setNotes(allNotes.filter((n) => n.module_id === moduleId));
      setQuizzes(moduleQuizzes);
      setMaterials(allMaterials.filter((m) => m.module_id === moduleId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        Alert.alert('Error', 'Failed to load module details');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const color = module?.color || Colors.primary;

  return (
    <View style={s.root}>
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />

      <Screen scroll={false} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(true); }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* ── Header ── */}
          <View style={s.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={s.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={s.backIcon}>←</Text>
            </Pressable>
            <Text style={s.pageTitle}>Module</Text>
          </View>

          {loading ? (
            <View style={{ gap: Spacing.md }}>
              <SkeletonCard height={180} />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : !module ? (
            <EmptyState title="Module not found" text="This module may have been deleted." icon="📚" />
          ) : (
            <>
              {/* ── Module Hero Card ── */}
              <View style={[s.heroCard, { borderTopColor: color }]}>
                {/* Header row */}
                <View style={s.heroTop}>
                  <View style={[s.heroIconWrap, { backgroundColor: color + '1A', borderColor: color + '40' }]}>
                    <Text style={s.heroIcon}>📚</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.heroName}>{module.name}</Text>
                    {module.description ? (
                      <Text style={s.heroDesc}>{module.description}</Text>
                    ) : (
                      <Text style={[s.heroDesc, { fontStyle: 'italic', color: Colors.textMuted }]}>
                        No description provided
                      </Text>
                    )}
                  </View>
                </View>

                {/* Stats pills */}
                <View style={s.statsRow}>
                  <View style={[s.statPill, { backgroundColor: color + '12', borderColor: color + '30' }]}>
                    <Text style={s.statIcon}>✎</Text>
                    <Text style={[s.statValue, { color }]}>{notes.length}</Text>
                    <Text style={s.statLabel}>Notes</Text>
                  </View>
                  <View style={[s.statPill, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
                    <Text style={s.statIcon}>📄</Text>
                    <Text style={[s.statValue, { color: '#10B981' }]}>{materials.length}</Text>
                    <Text style={s.statLabel}>Materials</Text>
                  </View>
                  <View style={[s.statPill, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
                    <Text style={s.statIcon}>🎯</Text>
                    <Text style={[s.statValue, { color: '#F59E0B' }]}>{quizzes.length}</Text>
                    <Text style={s.statLabel}>Quizzes</Text>
                  </View>
                </View>
              </View>

              {/* ── Quick Actions ── */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Quick Actions</Text>
                <View style={s.actionsRow}>
                  {[
                    { icon: '✎', label: 'Note',      route: `/notes/new?module_id=${id}`,  color: color },
                    { icon: '📄', label: 'Material', route: `/materials?module_id=${id}`,  color: '#10B981' },
                    { icon: '🎯', label: 'Quiz',     route: `/quizzes?module_id=${id}`,    color: '#F59E0B' },
                    { icon: '📅', label: 'Plan',     route: '/planning',                   color: '#8B5CF6' },
                  ].map((action) => (
                    <Pressable
                      key={action.label}
                      onPress={() => router.push(action.route as never)}
                      style={({ pressed }) => [
                        s.actionBtn,
                        { backgroundColor: action.color + '14', borderColor: action.color + '30' },
                        pressed && { opacity: 0.72, transform: [{ scale: 0.96 }] },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                    >
                      <View style={[s.actionIconWrap, { backgroundColor: action.color + '1A', borderColor: action.color + '35' }]}>
                        <Text style={s.actionIconText}>{action.icon}</Text>
                      </View>
                      <Text style={[s.actionLabel, { color: action.color }]}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* ── Module Quizzes ── */}
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>🎯 Saved Quizzes</Text>
                  <Pressable
                    onPress={() => router.push(`/quizzes?module_id=${id}` as never)}
                    hitSlop={8}
                  >
                    <Text style={[s.seeAllText, { color: '#F59E0B' }]}>
                      {quizzes.length > 0 ? 'View All →' : '+ Generate'}
                    </Text>
                  </Pressable>
                </View>

                {quizzes.length === 0 ? (
                  <View style={s.emptyCard}>
                    <View style={[s.emptyIconWrap, { backgroundColor: '#F59E0B14', borderColor: '#F59E0B30' }]}>
                      <Text style={s.emptyIconText}>🎯</Text>
                    </View>
                    <Text style={s.emptyTitle}>No quizzes in this module</Text>
                    <Text style={s.emptyText}>
                      Generate an AI quiz from your notes or materials to save it under {module.name}.
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/quizzes?module_id=${id}` as never)}
                      style={({ pressed }) => [
                        s.emptyCta,
                        { backgroundColor: '#F59E0B' },
                        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <Text style={s.emptyCtaText}>✨ Generate Quiz for {module.name}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    {quizzes.map((quiz) => (
                      <Pressable
                        key={quiz.id}
                        onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: String(quiz.id) } })}
                        style={({ pressed }) => [s.noteCard, pressed && s.noteCardPressed]}
                      >
                        <View style={[s.noteAccent, { backgroundColor: '#F59E0B' }]} />
                        <View style={s.noteBody}>
                          <Text style={s.noteTitle} numberOfLines={1}>{quiz.title}</Text>
                          {quiz.description ? (
                            <Text style={s.notePreview} numberOfLines={1}>{quiz.description}</Text>
                          ) : null}
                          <View style={s.noteFooter}>
                            <Text style={s.noteDate}>
                              {(quiz.questions?.length ?? 0)} questions · {new Date(quiz.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </Text>
                            <View style={[s.noteOpenBadge, { backgroundColor: '#F59E0B14', borderColor: '#F59E0B30' }]}>
                              <Text style={[s.noteOpenText, { color: '#F59E0B' }]}>Take Quiz →</Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* ── Recent Notes ── */}
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>Recent Notes</Text>
                  {notes.length > 0 && (
                    <Pressable
                      onPress={() => router.push(`/notes?module_id=${id}` as never)}
                      hitSlop={8}
                    >
                      <Text style={[s.seeAllText, { color }]}>View All →</Text>
                    </Pressable>
                  )}
                </View>

                {notes.length === 0 ? (
                  <View style={s.emptyCard}>
                    <View style={[s.emptyIconWrap, { backgroundColor: color + '14', borderColor: color + '30' }]}>
                      <Text style={s.emptyIconText}>✎</Text>
                    </View>
                    <Text style={s.emptyTitle}>No notes yet</Text>
                    <Text style={s.emptyText}>
                      Create your first note for this module to get started.
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/notes/new?module_id=${id}` as never)}
                      style={({ pressed }) => [
                        s.emptyCta,
                        { backgroundColor: color },
                        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <Text style={s.emptyCtaText}>+ Create First Note</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    {notes.slice(0, 4).map((note) => {
                      const preview = note.content.length > 80
                        ? note.content.substring(0, 80) + '…'
                        : note.content;
                      const dateStr = new Date(note.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

                      return (
                        <Pressable
                          key={note.id}
                          onPress={() => router.push(`/notes/${note.id}` as never)}
                          style={({ pressed }) => [s.noteCard, pressed && s.noteCardPressed]}
                          accessibilityRole="button"
                          accessibilityLabel={`Open note: ${note.title}`}
                        >
                          <View style={[s.noteAccent, { backgroundColor: color }]} />
                          <View style={s.noteBody}>
                            <Text style={s.noteTitle} numberOfLines={1}>{note.title}</Text>
                            {!!preview && (
                              <Text style={s.notePreview} numberOfLines={2}>{preview}</Text>
                            )}
                            <View style={s.noteFooter}>
                              <Text style={s.noteDate}>{dateStr}</Text>
                              <View style={[s.noteOpenBadge, { backgroundColor: color + '14', borderColor: color + '30' }]}>
                                <Text style={[s.noteOpenText, { color }]}>Open →</Text>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </Screen>

      <BottomNav active="Modules" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },

  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.xl,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  backIcon:  { fontSize: 20, color: Colors.textPrimary, fontWeight: Typography.weight.bold },
  pageTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },

  // ── Hero Card ─────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 5,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.md,
  },
  heroTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: Radius.xl,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroIcon:     { fontSize: 26 },
  heroName:     { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black, lineHeight: 28 },
  heroDesc:     { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20, marginTop: 3 },

  statsRow:   { flexDirection: 'row', gap: Spacing.sm },
  statPill: {
    flex: 1, alignItems: 'center',
    paddingVertical: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, gap: 4,
  },
  statIcon:   { fontSize: 18 },
  statValue:  { fontSize: Typography.size.xl, fontWeight: Typography.weight.black, lineHeight: 26 },
  statLabel:  { color: Colors.textMuted, fontSize: Typography.size['2xs'], fontWeight: Typography.weight.semibold },

  // ── Section ───────────────────────────────────────────────────────────────────
  section:          { gap: Spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:     { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  seeAllText:       { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  // ── Actions ───────────────────────────────────────────────────────────────────
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    paddingVertical: Spacing.md, borderRadius: Radius.xl, borderWidth: 1,
    ...Shadow.xs,
  },
  actionIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  actionIconText: { fontSize: 18 },
  actionLabel:    { fontSize: Typography.size.xs, fontWeight: Typography.weight.black, letterSpacing: 0.3 },

  // ── Note Card ─────────────────────────────────────────────────────────────────
  noteCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.xs,
  },
  noteCardPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  noteAccent:      { width: 4, alignSelf: 'stretch' },
  noteBody:        { flex: 1, padding: Spacing.md, gap: Spacing.xs },
  noteTitle:       { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, lineHeight: 20 },
  notePreview:     { color: Colors.textSecondary, fontSize: Typography.size.xs, lineHeight: 18 },
  noteFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  noteDate:        { color: Colors.textMuted, fontSize: Typography.size['2xs'] },
  noteOpenBadge:   { paddingHorizontal: Spacing.xs, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  noteOpenText:    { fontSize: Typography.size['2xs'], fontWeight: Typography.weight.black },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyIconText: { fontSize: 32 },
  emptyTitle:    { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black },
  emptyText:     { color: Colors.textMuted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
  emptyCta: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    ...Shadow.sm,
  },
  emptyCtaText:  { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
});
