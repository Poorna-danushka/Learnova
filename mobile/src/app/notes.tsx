import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Text,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  BottomNav,
  SearchInput,
  Chip,
  EmptyState,
  SkeletonCard,
  Badge,
} from '@/components/ui';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { getNotes, Note, deleteNote } from '@/services/api/noteApi';
import { getModules, Module as Subject } from '@/services/api/moduleApi';
import { useAuth } from '@/context/AuthContext';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import axios from 'axios';

// ─── Note Card ────────────────────────────────────────────────────────────────
function NoteCard({
  note, subject, onPress, onDelete, animationDelay = 0,
}: {
  note: Note; subject?: Subject; onPress: () => void;
  onDelete: () => void; animationDelay?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const color = subject?.color || Colors.primary;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, friction: 7, tension: 40,
      delay: animationDelay, useNativeDriver: true,
    }).start();
  }, [animationDelay, scaleAnim]);

  const preview = note.content.length > 120
    ? note.content.substring(0, 120) + '…'
    : note.content;

  const dateStr = new Date(note.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeStr = new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={`Open note: ${note.title}`}
        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      >
        {/* Left accent */}
        <View style={[s.cardAccent, { backgroundColor: color }]} />

        <View style={s.cardBody}>
          {/* Top row: icon + title + delete */}
          <View style={s.cardTop}>
            <View style={[s.cardIconWrap, { backgroundColor: color + '18', borderColor: color + '35' }]}>
              <Text style={[s.cardIconText, { color }]}>✎</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={1}>{note.title}</Text>
              {subject && (
                <View style={{ marginTop: 3 }}>
                  <Badge label={subject.name} color={color} size="xs" />
                </View>
              )}
            </View>
            <Pressable
              onPress={(e) => { e?.stopPropagation?.(); onDelete(); }}
              hitSlop={8}
              style={s.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel="Delete note"
            >
              <Text style={s.deleteBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Preview */}
          {!!preview && (
            <Text style={s.cardPreview} numberOfLines={2}>{preview}</Text>
          )}

          {/* Footer */}
          <View style={s.cardFooter}>
            <View style={[s.cardDateBadge]}>
              <Text style={s.cardDateText}>{dateStr} · {timeStr}</Text>
            </View>
            <View style={[s.cardReadMore, { backgroundColor: color + '14', borderColor: color + '30' }]}>
              <Text style={[s.cardReadMoreText, { color }]}>Open →</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function NotesStats({ notes, subjects }: { notes: Note[]; subjects: Subject[] }) {
  const total = notes.length;
  const thisWeek = notes.filter((n) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(n.created_at) >= weekAgo;
  }).length;
  const bySubject = subjects.length;

  const items = [
    { icon: '📝', value: total,     label: 'Total',      color: Colors.primary,     bg: Colors.primarySubtle,  border: Colors.primaryMuted },
    { icon: '✨', value: thisWeek,  label: 'This Week',  color: Colors.success,     bg: Colors.successMuted,   border: Colors.success + '30' },
    { icon: '📚', value: bySubject, label: 'Modules',    color: '#D97706',          bg: '#FFFBEB',             border: '#D9770630' },
  ];

  return (
    <View style={s.statsRow}>
      {items.map((item, i) => (
        <View
          key={i}
          style={[s.statPill, { backgroundColor: item.bg, borderColor: item.border }]}
        >
          <Text style={s.statPillIcon}>{item.icon}</Text>
          <Text style={[s.statPillValue, { color: item.color }]}>{item.value}</Text>
          <Text style={s.statPillLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NotesScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { module_id } = useLocalSearchParams<{ module_id?: string }>();

  const [notes, setNotes]       = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);

  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [n, s] = await Promise.all([getNotes(), getModules()]);
      setNotes(n);
      setSubjects(s);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (module_id) setSubjectFilter(Number(module_id));
  }, [module_id]);

  const confirmDeleteNote = async () => {
    if (!noteToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteNote(noteToDelete.id);
      setNotes((p) => p.filter((n) => n.id !== noteToDelete.id));
      setNoteToDelete(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Failed to delete note.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
                          n.content.toLowerCase().includes(search.toLowerCase());
      const matchSub    = subjectFilter ? n.module_id === subjectFilter : true;
      return matchSearch && matchSub;
    });
  }, [notes, search, subjectFilter]);

  const newNoteRoute = subjectFilter ? `/notes/new?module_id=${subjectFilter}` : '/notes/new';

  return (
    <View style={s.root}>
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />

      <Screen scroll={false} style={{ flex: 1 }}>
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
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          >
            {/* ── Header ── */}
          <View style={s.topRow}>
            <View style={s.titleBlock}>
              <Text style={s.pageTitle}>Notes</Text>
              <Text style={s.pageSubtitle}>
                {loading ? 'Loading…' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(newNoteRoute as any)}
              style={({ pressed }) => [s.addFab, pressed && { opacity: 0.85, transform: [{ scale: 0.94 }] }]}
              accessibilityRole="button"
              accessibilityLabel="Create new note"
            >
              <Text style={s.addFabIcon}>+</Text>
            </Pressable>
          </View>

          {/* ── Stats ── */}
          {!loading && notes.length > 0 && (
            <NotesStats notes={notes} subjects={subjects} />
          )}

          {/* ── Search ── */}
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search notes…" />

          {/* ── Module filter chips ── */}
          {subjects.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipScroll}
            >
              <Chip
                label="All"
                active={subjectFilter === null}
                onPress={() => setSubjectFilter(null)}
              />
              {subjects.map((sub) => (
                <Chip
                  key={sub.id}
                  label={sub.name}
                  active={subjectFilter === sub.id}
                  onPress={() => setSubjectFilter(sub.id)}
                  color={sub.color}
                />
              ))}
            </ScrollView>
          )}

          {/* ── Content ── */}
          {loading ? (
            <View style={{ gap: Spacing.md }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </View>
          ) : notes.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Text style={s.emptyEmoji}>✎</Text>
              </View>
              <Text style={s.emptyTitle}>No notes yet</Text>
              <Text style={s.emptyText}>
                Capture your first thought, idea, or study note.
              </Text>
              <Pressable
                onPress={() => router.push(newNoteRoute as any)}
                style={({ pressed }) => [s.emptyCta, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
              >
                <Text style={s.emptyCtaText}>+ Create First Note</Text>
              </Pressable>
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState title="No matches" text="Try a different search or filter." icon="⌕" />
          ) : (
            <View style={{ gap: Spacing.md }}>
              {filtered.map((note, idx) => {
                const subject = subjects.find((s) => s.id === note.module_id);
                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    subject={subject}
                    onPress={() => router.push(`/notes/${note.id}` as any)}
                    onDelete={() => setNoteToDelete(note)}
                    animationDelay={idx * 60}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </Screen>

      <BottomNav active="Notes" onNavigate={(r) => router.push(r as never)} />

      <DeleteConfirmModal
        visible={!!noteToDelete}
        title="Delete Note?"
        itemTitle={noteToDelete?.title}
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={() => void confirmDeleteNote()}
        onClose={() => setNoteToDelete(null)}
      />
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
    paddingBottom: 200,
    gap: Spacing.lg,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock:  { gap: 3 },
  pageTitle:   {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  pageSubtitle:{ color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  addFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.glow,
  },
  addFabIcon:  { color: Colors.white, fontSize: 28, fontWeight: Typography.weight.black, lineHeight: 30 },

  // ── Stats ─────────────────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statPill: {
    flex: 1, alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 4,
  },
  statPillIcon:  { fontSize: 18 },
  statPillValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.black, lineHeight: 26 },
  statPillLabel: { color: Colors.textMuted, fontSize: Typography.size['2xs'], fontWeight: Typography.weight.semibold },

  chipScroll: { gap: Spacing.sm, paddingBottom: Spacing.xs },

  // ── Note Card ─────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardPressed:  { opacity: 0.86, transform: [{ scale: 0.985 }] },
  cardAccent:   { width: 5, alignSelf: 'stretch' },
  cardBody:     { flex: 1, padding: Spacing.lg, gap: Spacing.sm },

  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardIconWrap: {
    width: 42, height: 42, borderRadius: Radius.lg,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIconText: { fontSize: 18 },
  cardTitle:    { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, lineHeight: 22 },

  cardPreview:  { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },

  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  cardDateBadge:{},
  cardDateText: { color: Colors.textMuted, fontSize: Typography.size.xs },
  cardReadMore: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  cardReadMoreText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  deleteBtn: {
    width: 30, height: 30, borderRadius: Radius.sm,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1, borderColor: Colors.error + '35',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  deleteBtnText: { color: Colors.error, fontSize: 10, fontWeight: Typography.weight.black },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyWrap:    { alignItems: 'center', paddingVertical: Spacing['4xl'], gap: Spacing.md },
  emptyIconWrap:{
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  emptyEmoji:   { fontSize: 38 },
  emptyTitle:   { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  emptyText:    {
    color: Colors.textMuted, fontSize: Typography.size.sm,
    textAlign: 'center', lineHeight: 22,
    paddingHorizontal: Spacing.xl, maxWidth: 280,
  },
  emptyCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadow.glow,
  },
  emptyCtaText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: Typography.weight.black },
});
