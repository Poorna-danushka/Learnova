import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Platform,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import {
  Screen,
  BottomNav,
  Chip,
  EmptyState,
  SkeletonCard,
  Button,
  Field,
  Message,
} from '@/components/ui';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import {
  getStudyMaterials, StudyMaterial,
  uploadStudyMaterial, deleteStudyMaterial, downloadStudyMaterial,
} from '@/services/api/studyMaterialApi';
import { getModules, Module as Subject } from '@/services/api/moduleApi';
import { useAuth } from '@/context/AuthContext';
import { askMaterial, parseAIError, isAuthError, type AIErrorKind } from '@/services/api/aiApi';
import { AIAnswerCard } from '@/components/AIAnswerCard';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import axios from 'axios';
import { getAccessToken } from '@/services/authStorage';
import { API_BASE_URL } from '@/services/api/apiClient';

interface MaterialAIState {
  expanded: boolean; question: string; asking: boolean;
  answer: string | null; error: AIErrorKind | null;
}
const INIT_AI: MaterialAIState = { expanded: false, question: '', asking: false, answer: null, error: null };

function fileBadge(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf')  return { label: 'PDF',  emoji: '📄', color: Colors.error };
  if (ext === 'docx') return { label: 'DOC',  emoji: '📝', color: Colors.info };
  if (ext === 'pptx') return { label: 'PPT',  emoji: '📊', color: Colors.warning };
  if (ext === 'txt')  return { label: 'TXT',  emoji: '📃', color: Colors.success };
  return { label: 'FILE', emoji: '📎', color: Colors.textMuted };
}

export default function MaterialsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { module_id } = useLocalSearchParams<{ module_id?: string }>();

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [moduleFilter, setmoduleFilter] = useState<number | null>(null);
  const [aiStates, setAiStates]   = useState<Record<number, MaterialAIState>>({});

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const fabScale = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (!loading && materials.length > 0) {
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
  }, [loading, materials.length]);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [m, s] = await Promise.all([getStudyMaterials(), getModules()]);
      setMaterials(m); setSubjects(s);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Auto-filter by module if module_id is provided in URL
  useEffect(() => {
    if (module_id) {
      setmoduleFilter(Number(module_id));
    }
  }, [module_id]);

  const handleUpload = async () => {
    if (subjects.length === 0) { Alert.alert('No Subjects', 'Create a module first before uploading materials.'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 10 * 1024 * 1024) { Alert.alert('File too large', 'Max file size is 10 MB.'); return; }
      
      setUploading(true);
      // FAB pulse animation
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      const moduleId = moduleFilter || subjects[0].id;
      const uploaded = await uploadStudyMaterial(moduleId, file.uri, file.name, file.mimeType || 'application/octet-stream');
      setMaterials((p) => [uploaded, ...p]);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete || deletingMaterial) return;
    setDeletingMaterial(true);
    try {
      await deleteStudyMaterial(materialToDelete.id);
      const targetId = materialToDelete.id;
      setMaterials((p) => p.filter((m) => m.id !== targetId));
      setAiStates((p) => { const n = { ...p }; delete n[targetId]; return n; });
      setMaterialToDelete(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Failed to delete material.');
    } finally {
      setDeletingMaterial(false);
    }
  };

  const openMaterial = async (mat: StudyMaterial) => {
    if (Platform.OS !== 'web') {
      try {
        const token = await getAccessToken();
        if (!FileSystem.cacheDirectory) throw new Error('Cache unavailable');
        const target = `${FileSystem.cacheDirectory}${mat.original_filename}`;
        const res = await FileSystem.downloadAsync(
          `${API_BASE_URL}/study-materials/${mat.id}/download`,
          target,
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
        );
        const uri = Platform.OS === 'android' ? await FileSystem.getContentUriAsync(res.uri) : res.uri;
        await Linking.openURL(uri);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
        else Alert.alert('Open failed', 'Unable to open this file.');
      }
      return;
    }
    try {
      const blob = await downloadStudyMaterial(mat.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Open failed', 'Unable to open this file.');
    }
  };

  const getAI = (id: number) => aiStates[id] ?? INIT_AI;
  const setAI = (id: number, patch: Partial<MaterialAIState>) =>
    setAiStates((p) => ({ ...p, [id]: { ...(p[id] ?? INIT_AI), ...patch } }));

  const handleAskAI = async (matId: number) => {
    const state = getAI(matId);
    if (state.asking) return;
    const q = state.question.trim();
    if (!q) { setAI(matId, { error: 'validation' }); return; }
    setAI(matId, { asking: true, answer: null, error: null });
    try {
      const res = await askMaterial(matId, q);
      setAI(matId, { asking: false, answer: res.answer });
    } catch (err) {
      if (isAuthError(err)) { signOut(); return; }
      setAI(matId, { asking: false, error: parseAIError(err) });
    }
  };

  const filtered = useMemo(() =>
    moduleFilter ? materials.filter((m) => m.module_id === moduleFilter) : materials,
    [materials, moduleFilter]
  );

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
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={Colors.primaryLight} />
            }
          >
          {/* Header */}
          <View style={s.topRow}>
            <View>
              <Text style={s.pageTitle}>📚 Materials</Text>
              <Text style={s.pageSubtitle}>{loading ? 'Loading…' : `${materials.length} file${materials.length !== 1 ? 's' : ''} uploaded`}</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: fabScale }] }}>
              <Pressable
                onPress={handleUpload}
                style={({ pressed }) => [s.uploadFab, pressed && { opacity: 0.8 }, uploading && { opacity: 0.5 }]}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Upload material"
              >
                <Text style={s.uploadFabIcon}>{uploading ? '⋯' : '↑'}</Text>
              </Pressable>
            </Animated.View>
          </View>

          {error && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}

          {/* Stats Card */}
          {!loading && materials.length > 0 && (
            <View style={s.statsCard}>
              <View style={s.statItem}>
                <View style={[s.statIconWrap, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
                  <Text style={s.statIcon}>📁</Text>
                </View>
                <View>
                  <Text style={s.statValue}>{materials.length}</Text>
                  <Text style={s.statLabel}>Total Files</Text>
                </View>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <View style={[s.statIconWrap, { backgroundColor: Colors.info + '15', borderColor: Colors.info + '30' }]}>
                  <Text style={s.statIcon}>💾</Text>
                </View>
                <View>
                  <Text style={s.statValue}>
                    {(materials.reduce((acc, m) => acc + m.file_size, 0) / (1024 * 1024)).toFixed(1)}
                  </Text>
                  <Text style={s.statLabel}>Total MB</Text>
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

          {/* Filter chips */}
          {subjects.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
              <Chip label="All" active={moduleFilter === null} onPress={() => setmoduleFilter(null)} />
              {subjects.map((sub) => (
                <Chip key={sub.id} label={sub.name} active={moduleFilter === sub.id} onPress={() => setmoduleFilter(sub.id)} color={sub.color} />
              ))}
            </ScrollView>
          )}

          {/* Upload hint */}
          <View style={s.hintBox}>
            <Text style={s.hintText}>💡 Supports PDF, DOCX, PPTX, TXT · Max 10 MB per file</Text>
          </View>

          {loading ? (
            <View style={{ gap: Spacing.md }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No materials yet"
              text="Upload lecture slides, PDFs, or notes to use with AI."
              action="Upload File"
              onAction={handleUpload}
              icon="↑"
            />
          ) : (
            <View style={{ gap: Spacing.md }}>
              {filtered.map((mat, idx) => {
                const subject = subjects.find((sub) => sub.id === mat.module_id);
                const badge   = fileBadge(mat.original_filename);
                const ai      = getAI(mat.id);

                return (
                  <Animated.View 
                    key={mat.id} 
                    style={[
                      s.card,
                      {
                        opacity: fadeAnim,
                        transform: [
                          { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                          { scale: scaleAnim },
                        ],
                      }
                    ]}
                  >
                    {/* File header */}
                    <View style={s.cardHeader}>
                      <View style={[s.fileIcon, { backgroundColor: badge.color + '18', borderColor: badge.color + '40' }]}>
                        <Text style={s.fileEmoji}>{badge.emoji}</Text>
                        <Text style={[s.fileIconText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                      <View style={s.fileMeta}>
                        <Text style={s.fileName} numberOfLines={1}>{mat.original_filename}</Text>
                        <Text style={s.fileSub}>
                          {subject ? <Text style={{ color: subject.color || Colors.primaryLight }}>{subject.name} · </Text> : null}
                          {(mat.file_size / (1024 * 1024)).toFixed(1)} MB · {new Date(mat.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {/* Action row */}
                    <View style={s.cardActions}>
                      <Pressable
                        onPress={() => void openMaterial(mat)}
                        style={({ pressed }) => [s.openBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                        accessibilityRole="button"
                      >
                        <Text style={s.openBtnText}>Open ↗</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const cur = getAI(mat.id);
                          setAI(mat.id, cur.expanded ? INIT_AI : { expanded: true });
                        }}
                        style={({ pressed }) => [s.aiBtn, ai.expanded && s.aiBtnActive, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                        accessibilityRole="button"
                      >
                        <Text style={[s.aiBtnText, ai.expanded && s.aiBtnTextActive]}>
                          {ai.expanded ? '✕ Close' : '✨ Ask AI'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setMaterialToDelete(mat)}
                        style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
                        accessibilityRole="button"
                      >
                        <Text style={s.deleteBtnText}>✕</Text>
                      </Pressable>
                    </View>

                    {/* AI panel */}
                    {ai.expanded && (
                      <View style={s.aiPanel}>
                        <View style={s.aiPanelDivider} />
                        <Field
                          label="Your question"
                          value={ai.question}
                          onChangeText={(t) => setAI(mat.id, { question: t, error: null, answer: null })}
                          placeholder="e.g. What is the main topic of this document?"
                          multiline
                          editable={!ai.asking}
                        />
                        {ai.error === 'validation' && <Message tone="error">Please enter a question.</Message>}
                        <Button
                          label={ai.asking ? 'Asking AI…' : '✨  Ask AI'}
                          onPress={() => void handleAskAI(mat.id)}
                          variant="secondary"
                          size="sm"
                          loading={ai.asking}
                          disabled={ai.asking}
                        />
                        <AIAnswerCard
                          question={ai.question}
                          answer={ai.answer}
                          loading={ai.asking}
                          error={ai.error !== 'validation' ? ai.error : null}
                          onDismiss={() => setAI(mat.id, { answer: null, error: null, question: '' })}
                          onRetry={() => void handleAskAI(mat.id)}
                        />
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </Screen>

      <BottomNav active="Modules" onNavigate={(r) => router.push(r as never)} />

      <DeleteConfirmModal
        visible={!!materialToDelete}
        title="Delete Material?"
        itemTitle={materialToDelete?.original_filename}
        description="Are you sure you want to delete this study material? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingMaterial}
        onConfirm={() => void confirmDeleteMaterial()}
        onClose={() => setMaterialToDelete(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 200, gap: Spacing.lg },

  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle:   { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  pageSubtitle:{ color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: 2 },
  uploadFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadow.lg,
  },
  uploadFabIcon: { color: Colors.white, fontSize: 22, fontWeight: Typography.weight.black },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
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

  chipScroll: { gap: Spacing.sm, paddingBottom: Spacing.xs },

  hintBox: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  hintText: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  fileIcon: {
    width: 56, height: 56, borderRadius: Radius.lg,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, gap: 2,
  },
  fileEmoji: { fontSize: 20 },
  fileIconText: { fontSize: 10, fontWeight: Typography.weight.black, letterSpacing: 0.5 },
  fileMeta:    { flex: 1 },
  fileName:    { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  fileSub:     { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 4 },

  cardActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  openBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  openBtnText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  aiBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.primarySubtle, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primaryMuted,
    ...Shadow.sm,
  },
  aiBtnActive:    { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  aiBtnText:      { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  aiBtnTextActive:{ color: Colors.textMuted },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.errorMuted, borderWidth: 1, borderColor: Colors.error + '35',
    alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
    ...Shadow.sm,
  },
  deleteBtnText: { color: Colors.error, fontSize: 13, fontWeight: Typography.weight.black },

  aiPanel:      { gap: Spacing.md, marginTop: Spacing.xs },
  aiPanelDivider:{ height: 1, backgroundColor: Colors.border, marginBottom: Spacing.xs },
});
