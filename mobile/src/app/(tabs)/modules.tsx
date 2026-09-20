import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  RefreshControl,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  SearchInput,
  EmptyState,
  SkeletonCard,
  Field,
  Button,
  Message,
} from '@/components/ui';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  getModules,
  createModule,
  updateModule,
  deleteModule,
  Module,
} from '@/services/api/moduleApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// ─── Color options ────────────────────────────────────────────────────────────
const MODULE_COLORS = [
  Colors.primary,  // teal
  '#10B981',       // green
  '#F59E0B',       // amber
  '#EF4444',       // red
  '#8B5CF6',       // purple
  '#EC4899',       // pink
];

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <View style={s.colorWrap}>
      <Text style={s.colorLabel}>Color</Text>
      <View style={s.colorRow}>
        {MODULE_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onSelect(c)}
            accessibilityRole="button"
            accessibilityLabel="Select color"
            style={[
              s.colorSwatch,
              { backgroundColor: c },
              selected === c && [s.colorSwatchSel, { borderColor: c, shadowColor: c }],
            ]}
          >
            {selected === c && <Text style={s.colorCheck}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Create / Edit Form Modal ───────────────────────────────────────────────
function ModuleFormModal({
  visible, title, name, setName, desc, setDesc, color, setColor,
  onCancel, onSubmit, submitLabel, loading, disabled,
}: {
  visible: boolean;
  title: string; name: string; setName: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  color: string; setColor: (v: string) => void;
  onCancel: () => void; onSubmit: () => void;
  submitLabel: string; loading: boolean; disabled: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.modalBackdrop} onPress={onCancel} />
        <View style={s.modalCard}>
          <View style={s.formHandleRow}>
            <View style={s.formHandle} />
          </View>
          <View style={s.modalTitleRow}>
            <Text style={s.formTitle}>{title}</Text>
            <Pressable
              onPress={onCancel}
              hitSlop={10}
              style={s.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close form"
            >
              <Text style={s.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Field
              label="Module name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Data Structures"
              returnKeyType="next"
            />
            <Field
              label="Description (optional)"
              value={desc}
              onChangeText={setDesc}
              placeholder="Brief description…"
              multiline
              returnKeyType="done"
            />
            <ColorPicker selected={color} onSelect={setColor} />

            {/* Live preview */}
            {name.trim() !== '' && (
              <View style={[s.preview, { borderLeftColor: color }]}>
                <View style={[s.previewDot, { backgroundColor: color }]} />
                <Text style={s.previewText} numberOfLines={1}>{name}</Text>
              </View>
            )}
          </ScrollView>

          <View style={s.formActions}>
            <Button label="Cancel" onPress={onCancel} variant="ghost" size="sm" />
            <Button label={submitLabel} onPress={onSubmit} loading={loading} disabled={disabled} size="sm" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────
function ModuleCard({
  module, onPress, onEdit, onDelete, animationDelay = 0,
}: {
  module: Module; onPress: () => void;
  onEdit: () => void; onDelete: () => void; animationDelay?: number;
}) {
  const color = module.color || Colors.primary;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, friction: 7, tension: 40,
      delay: animationDelay, useNativeDriver: true,
    }).start();
  }, [animationDelay, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
      <View style={s.card}>
        {/* Top color strip */}
        <View style={[s.cardStrip, { backgroundColor: color }]} />

        <Pressable
          onPress={onPress}
          accessibilityLabel={`Open ${module.name}`}
          style={({ pressed }) => [s.cardPressable, pressed && s.cardPressed]}
        >
          <View style={s.cardContent}>
            {/* Icon + name + desc */}
            <View style={s.cardLeft}>
              <View style={[s.cardIconCircle, { backgroundColor: color + '1A', borderColor: color + '40' }]}>
                <Text style={s.cardIconText}>📚</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName} numberOfLines={1}>{module.name}</Text>
                {module.description ? (
                  <Text style={s.cardDesc} numberOfLines={1}>{module.description}</Text>
                ) : (
                  <Text style={[s.cardDesc, { fontStyle: 'italic' }]}>No description</Text>
                )}
              </View>
            </View>
          </View>
        </Pressable>

        {/* Footer with clean action controls */}
        <View style={s.cardFooter}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [s.cardCtaBtn, { backgroundColor: color + '14', borderColor: color + '30' }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[s.cardViewText, { color }]}>View Content →</Text>
          </Pressable>

          <View style={s.cardActionsRow}>
            <Pressable
              onPress={onEdit}
              hitSlop={8}
              style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Edit module"
            >
              <Text style={s.editBtnText}>✎</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Delete module"
            >
              <Text style={s.deleteBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ modules }: { modules: Module[] }) {
  return (
    <View style={s.statsCard}>
      <View style={s.statsLeft}>
        <View style={s.statsIconWrap}>
          <Text style={s.statsIcon}>📚</Text>
        </View>
        <View>
          <Text style={s.statsValue}>{modules.length}</Text>
          <Text style={s.statsLabel}>Total Modules</Text>
        </View>
      </View>
      <Text style={s.statsTagline}>Organize your learning</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ModulesScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [modules, setModules]       = useState<Module[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [newColor, setNewColor]     = useState(MODULE_COLORS[0]);
  const [creating, setCreating]     = useState(false);

  const [editing, setEditing]       = useState<Module | null>(null);
  const [editName, setEditName]     = useState('');
  const [editDesc, setEditDesc]     = useState('');
  const [editColor, setEditColor]   = useState(MODULE_COLORS[0]);
  const [saving, setSaving]         = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      setModules(await getModules());
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Failed to load modules.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const mod = await createModule({ name: newName.trim(), description: newDesc.trim() || undefined, color: newColor });
      setModules((p) => [...p, mod]);
      setNewName(''); setNewDesc(''); setNewColor(MODULE_COLORS[0]);
      setShowCreate(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Failed to create module.');
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete || deletingModule) return;
    setDeletingModule(true);
    try {
      await deleteModule(moduleToDelete.id);
      setModules((p) => p.filter((m) => m.id !== moduleToDelete.id));
      setModuleToDelete(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Failed to delete module.');
    } finally {
      setDeletingModule(false);
    }
  };

  const startEdit = (mod: Module) => {
    setEditing(mod);
    setEditName(mod.name);
    setEditDesc(mod.description || '');
    setEditColor(mod.color || MODULE_COLORS[0]);
    setShowCreate(false);
  };

  const handleEdit = async () => {
    if (!editing || !editName.trim()) return;
    try {
      setSaving(true);
      const updated = await updateModule(editing.id, { name: editName.trim(), description: editDesc.trim() || undefined, color: editColor });
      setModules((p) => p.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Failed to update module.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return modules;
    const q = search.toLowerCase();
    return modules.filter((m) => m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
  }, [modules, search]);

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
                <Text style={s.pageTitle}>Modules</Text>
                <Text style={s.pageSubtitle}>
                  {loading
                    ? 'Loading…'
                    : modules.length === 0
                    ? 'No modules yet'
                    : `${modules.length} module${modules.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Pressable
                onPress={() => { setShowCreate((v) => !v); setEditing(null); }}
                style={({ pressed }) => [s.addFab, pressed && { opacity: 0.8, transform: [{ scale: 0.94 }] }]}
                accessibilityRole="button"
                accessibilityLabel={showCreate ? 'Close form' : 'Create module'}
              >
                <Text style={s.addFabIcon}>{showCreate ? '−' : '+'}</Text>
              </Pressable>
            </View>

            {error && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}

            {/* ── Stats ── */}
            {!loading && modules.length > 0 && <StatsBar modules={modules} />}

            {/* ── Search ── */}
            {!loading && modules.length > 0 && (
              <SearchInput value={search} onChangeText={setSearch} placeholder="Search modules…" />
            )}

            {/* ── Create / Edit form modals ── */}
            <ModuleFormModal
              visible={showCreate}
              title="New Module"
              name={newName} setName={setNewName}
              desc={newDesc} setDesc={setNewDesc}
              color={newColor} setColor={setNewColor}
              onCancel={() => setShowCreate(false)}
              onSubmit={handleCreate}
              submitLabel="Create Module"
              loading={creating}
              disabled={!newName.trim()}
            />

            <ModuleFormModal
              visible={!!editing}
              title="Edit Module"
              name={editName} setName={setEditName}
              desc={editDesc} setDesc={setEditDesc}
              color={editColor} setColor={setEditColor}
              onCancel={() => setEditing(null)}
              onSubmit={handleEdit}
              submitLabel="Save Changes"
              loading={saving}
              disabled={!editName.trim()}
            />

            {/* ── List ── */}
            {loading ? (
              <View style={{ gap: Spacing.md }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </View>
            ) : modules.length === 0 && !showCreate ? (
              <View style={s.emptyWrap}>
                <View style={s.emptyIconWrap}>
                  <Text style={s.emptyEmoji}>📚</Text>
                </View>
                <Text style={s.emptyTitle}>No modules yet</Text>
                <Text style={s.emptyText}>
                  Create your first module to organize your learning by subject or course.
                </Text>
                <Pressable
                  onPress={() => setShowCreate(true)}
                  style={({ pressed }) => [s.emptyCta, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
                >
                  <Text style={s.emptyCtaText}>+ Create First Module</Text>
                </Pressable>
              </View>
            ) : filtered.length === 0 && modules.length > 0 ? (
              <EmptyState title="No matches" text="Try a different search." icon="🔍" />
            ) : modules.length > 0 && !showCreate ? (
              <View style={{ gap: Spacing.md }}>
                {filtered.map((mod, idx) => (
                  <ModuleCard
                    key={mod.id}
                    module={mod}
                    onPress={() => router.push(`/modules/${mod.id}` as any)}
                    onEdit={() => startEdit(mod)}
                    onDelete={() => setModuleToDelete(mod)}
                    animationDelay={idx * 60}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>

      <DeleteConfirmModal
        visible={!!moduleToDelete}
        title="Delete Module?"
        itemTitle={moduleToDelete?.name}
        description="Are you sure you want to delete this module? This action will not delete related notes or study materials."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingModule}
        onConfirm={() => void confirmDeleteModule()}
        onClose={() => setModuleToDelete(null)}
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
  addFabIcon: { color: Colors.white, fontSize: 28, fontWeight: Typography.weight.black, lineHeight: 30 },

  // ── Stats ─────────────────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.sm,
  },
  statsLeft:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statsIconWrap:{
    width: 48, height: 48, borderRadius: Radius.xl,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  statsIcon:    { fontSize: 22 },
  statsValue:   { color: Colors.primary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black, lineHeight: 30 },
  statsLabel:   { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  statsTagline: { color: Colors.textMuted, fontSize: Typography.size.xs, maxWidth: 120, textAlign: 'right', lineHeight: 16 },

  // ── Modal Form ────────────────────────────────────────────────────────────────
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

  // ── Form card ─────────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  formHandleRow: { alignItems: 'center' },
  formHandle:    { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full },
  formTitle:     { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  formActions:   { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },

  colorWrap:     { gap: Spacing.sm },
  colorLabel:    { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  colorRow:      { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  colorSwatch: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchSel:{
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  colorCheck:    { color: Colors.white, fontSize: 16, fontWeight: Typography.weight.black },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg, borderLeftWidth: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  previewDot:  { width: 10, height: 10, borderRadius: 5 },
  previewText: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, flex: 1 },

  // ── Module Card ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardStrip:    { height: 5, width: '100%' },
  cardPressable:{},
  cardPressed:  { opacity: 0.86 },
  cardContent:  {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardLeft:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  cardIconCircle:{
    width: 48, height: 48, borderRadius: Radius.xl,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIconText:  { fontSize: 22 },
  cardName:      { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, lineHeight: 22 },
  cardDesc:      { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  cardFooter:    {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cardCtaBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  cardViewText:  { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  cardActionsRow:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  editBtn: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Colors.primarySubtle, borderWidth: 1, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnText:  { color: Colors.primary, fontSize: 15 },
  deleteBtn: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Colors.errorMuted, borderWidth: 1, borderColor: Colors.error + '35',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText:{ color: Colors.error, fontSize: 10, fontWeight: Typography.weight.black },

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
  emptyEmoji:   { fontSize: 40 },
  emptyTitle:   { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  emptyText:    {
    color: Colors.textMuted, fontSize: Typography.size.sm,
    textAlign: 'center', lineHeight: 22,
    paddingHorizontal: Spacing.xl, maxWidth: 300,
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
