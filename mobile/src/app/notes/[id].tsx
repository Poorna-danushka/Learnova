import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { Message } from '@/components/ui';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  createNote,
  deleteNote,
  getNoteById,
  getNotes,
  updateNote,
  type Note,
} from '@/services/api/noteApi';
import { getModules, type Module } from '@/services/api/moduleApi';

// ─────────────────────────────────────────────────────────────────────────────
// NoteEditorScreen
//
// Handles two modes:
//   • CREATE  — route: /notes/new?module_id=<id>
//   • EDIT    — route: /notes/<id>
// ─────────────────────────────────────────────────────────────────────────────
export default function NoteEditorScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  // Expo Router gives us the dynamic segment as `id`.
  // For /notes/new the literal string "new" is used; for /notes/42 it's "42".
  const params = useLocalSearchParams<{ id?: string; module_id?: string }>();
  const isNew = params.id === 'new' || !params.id;
  const noteId = isNew ? null : Number(params.id);
  const preselectedModuleId = params.module_id ? Number(params.module_id) : null;

  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [moduleId, setModuleId] = useState<number | null>(preselectedModuleId);
  const [modules, setModules]   = useState<Module[]>([]);
  const [note, setNote]         = useState<Note | null>(null);

  const [loadingNote, setLoadingNote] = useState(!isNew);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [dirty, setDirty]             = useState(false);

  const titleRef = useRef<TextInput>(null);

  // ── Load modules + existing note (edit mode) ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const mods = await getModules();
        setModules(mods);

        if (!isNew && noteId) {
          setLoadingNote(true);
          // getNoteById not always available — fall back to list filter
          let target: Note | undefined;
          try {
            target = await getNoteById(noteId);
          } catch {
            const all = await getNotes();
            target = all.find((n) => n.id === noteId);
          }
          if (target) {
            setNote(target);
            setTitle(target.title);
            setContent(target.content);
            setModuleId(target.module_id);
          } else {
            setError('Note not found.');
          }
        } else if (isNew && preselectedModuleId) {
          setModuleId(preselectedModuleId);
        } else if (isNew && mods.length > 0 && !preselectedModuleId) {
          setModuleId(mods[0].id);
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
        else setError('Failed to load data.');
      } finally {
        setLoadingNote(false);
      }
    };
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus title on create
  useEffect(() => {
    if (!loadingNote && isNew) {
      setTimeout(() => titleRef.current?.focus(), 300);
    }
  }, [loadingNote, isNew]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!moduleId) { setError('Please select a module.'); return; }
    setSaving(true); setError(null);
    try {
      if (isNew) {
        await createNote({ title: title.trim(), content: content.trim(), module_id: moduleId });
      } else if (noteId) {
        await updateNote(noteId, { title: title.trim(), content: content.trim(), module_id: moduleId });
      }
      setDirty(false);
      router.back();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!noteId || deleting) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNote(noteId);
      setShowDeleteModal(false);
      router.back();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Failed to delete note.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Back / discard guard ─────────────────────────────────────────────────
  const handleBack = () => {
    if (!dirty) { router.back(); return; }
    if (Platform.OS === 'web') { router.back(); return; }
    Alert.alert('Discard changes?', 'You have unsaved changes.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const selectedModule = modules.find((m) => m.id === moduleId);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingNote) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={s.backArrow}>←</Text>
          </Pressable>

          <Text style={s.headerTitle} numberOfLines={1}>
            {isNew ? 'New Note' : 'Edit Note'}
          </Text>

          <View style={s.headerActions}>
            {!isNew && (
              <Pressable
                onPress={handleDelete}
                style={s.deleteBtn}
                disabled={deleting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
              >
                {deleting
                  ? <ActivityIndicator color={Colors.error} size="small" />
                  : <Text style={s.deleteBtnText}>✕</Text>
                }
              </Pressable>
            )}
            <Pressable
              onPress={handleSave}
              style={[s.saveBtn, (saving || !title.trim()) && s.saveBtnDisabled]}
              disabled={saving || !title.trim()}
              accessibilityRole="button"
              accessibilityLabel="Save note"
            >
              {saving
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={s.saveBtnText}>Save</Text>
              }
            </Pressable>
          </View>
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
          >
            {error && (
              <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>
            )}

            {/* ── Module selector ── */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>MODULE</Text>
              {modules.length === 0 ? (
                <Pressable
                  style={s.moduleEmptyCard}
                  onPress={() => router.push('/modules')}
                  accessibilityRole="button"
                >
                  <Text style={s.moduleEmptyText}>No modules yet — tap to create one</Text>
                </Pressable>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.moduleChips}
                >
                  {modules.map((mod) => {
                    const active = moduleId === mod.id;
                    const color = mod.color || Colors.primary;
                    return (
                      <Pressable
                        key={mod.id}
                        onPress={() => { setModuleId(mod.id); setDirty(true); }}
                        style={[
                          s.moduleChip,
                          active && { backgroundColor: color + '22', borderColor: color },
                          !active && s.moduleChipInactive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={mod.name}
                      >
                        <View style={[s.moduleChipDot, { backgroundColor: color }]} />
                        <Text style={[s.moduleChipText, active && { color }]}>
                          {mod.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* ── Title ── */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>TITLE</Text>
              <TextInput
                ref={titleRef}
                value={title}
                onChangeText={(t) => { setTitle(t); setDirty(true); }}
                placeholder="Note title…"
                placeholderTextColor={Colors.textMuted}
                style={s.titleInput}
                returnKeyType="next"
                accessibilityLabel="Note title"
                maxLength={200}
              />
            </View>

            {/* ── Content ── */}
            <View style={[s.section, { flex: 1 }]}>
              <View style={s.contentLabelRow}>
                <Text style={s.sectionLabel}>CONTENT</Text>
                <Text style={s.charCount}>{content.length} chars</Text>
              </View>
              <TextInput
                value={content}
                onChangeText={(t) => { setContent(t); setDirty(true); }}
                placeholder="Write your note here…"
                placeholderTextColor={Colors.textMuted}
                style={s.contentInput}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Note content"
                scrollEnabled={false}
              />
            </View>

            {/* Module badge */}
            {selectedModule && (
              <View style={s.moduleFooter}>
                <View
                  style={[
                    s.moduleBadge,
                    { backgroundColor: (selectedModule.color || Colors.primary) + '18', borderColor: (selectedModule.color || Colors.primary) + '40' },
                  ]}
                >
                  <View style={[s.moduleBadgeDot, { backgroundColor: selectedModule.color || Colors.primary }]} />
                  <Text style={[s.moduleBadgeText, { color: selectedModule.color || Colors.primaryLight }]}>
                    {selectedModule.name}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DeleteConfirmModal
        visible={showDeleteModal}
        title="Delete Note?"
        itemTitle={title || 'this note'}
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={() => void confirmDeleteNote()}
        onClose={() => setShowDeleteModal(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  backArrow: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    marginHorizontal: Spacing.xs,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 0 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1, borderColor: Colors.error + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { color: Colors.error, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 64,
    ...Shadow.sm,
  },
  saveBtnDisabled: { backgroundColor: Colors.primaryMuted, opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 200,
    gap: Spacing.lg,
  },
  section: { gap: Spacing.sm },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.black,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // ── Module chips ──────────────────────────────────────────────────────────
  moduleChips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  moduleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  moduleChipInactive: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
  moduleChipDot: { width: 8, height: 8, borderRadius: 4 },
  moduleChipText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  moduleEmptyCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  moduleEmptyText: { color: Colors.textMuted, fontSize: Typography.size.sm },

  // ── Title & content inputs ────────────────────────────────────────────────
  titleInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  contentLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  charCount: { color: Colors.textMuted, fontSize: Typography.size.xs },
  contentInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    lineHeight: 24,
    minHeight: 240,
  },

  // ── Module footer badge ───────────────────────────────────────────────────
  moduleFooter: { alignItems: 'flex-start' },
  moduleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
  },
  moduleBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  moduleBadgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
});
