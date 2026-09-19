import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import {
  AI_ERROR_MESSAGES,
  createAIConversation,
  deleteAIConversation,
  getAIConversations,
  getAIMessages,
  isAuthError,
  parseAIError,
  renameAIConversation,
  sendAIMessage,
} from '@/services/api/aiApi';
import type { AIConversation, AIErrorKind, AIMessage } from '@/types/ai';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { BottomNav } from '@/components/ui';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { AIResponseRenderer } from '@/components/AIResponseRenderer';
import { AIMessageActions } from '@/components/ai/AIMessageActions';
import { FollowUpChips } from '@/components/ai/FollowUpChips';

// ── Multi-Stage Typing & Loading Indicator ─────────────────────────────────────────
function TypingDots({ stage }: { stage: 'thinking' | 'typing' }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.delay((2 - i) * 140),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={td.wrap}>
      <View style={td.aiAvatar}>
        <Text style={td.avatarText}>✨</Text>
      </View>
      <View style={td.bubble}>
        <Text style={td.stageLabel}>
          {stage === 'thinking' ? 'Thinking…' : 'Typing…'}
        </Text>
        <View style={td.row}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                td.dot,
                {
                  opacity: dot,
                  transform: [
                    { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const td = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14 },
  bubble: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderTopLeftRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
    ...Shadow.sm,
  },
  stageLabel: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
  },
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.primaryLight },
});

// ── Message Bubble ────────────────────────────────────────────────────────────────
function MessageBubble({
  message,
  index,
  isLast,
  onRegenerate,
  onSelectFollowUp,
}: {
  message: AIMessage;
  index: number;
  isLast: boolean;
  onRegenerate?: () => void;
  onSelectFollowUp?: (prompt: string) => void;
}) {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay: Math.min(index * 30, 150),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        delay: Math.min(index * 30, 150),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        mb.row,
        isUser ? mb.rowRight : mb.rowLeft,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={mb.aiAvatar}>
          <Text style={mb.aiAvatarText}>✨</Text>
        </View>
      )}
      <View style={[mb.bubble, isUser ? mb.userBubble : mb.aiBubble]}>
        {!isUser && (
          <View style={mb.aiHeaderRow}>
            <Text style={mb.aiLabel}>LEARNOVA AI</Text>
          </View>
        )}

        {isUser ? (
          <Text style={mb.userText} selectable>
            {message.content}
          </Text>
        ) : (
          <AIResponseRenderer content={message.content} />
        )}

        <Text style={[mb.time, isUser ? mb.timeRight : mb.timeLeft]}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {!isUser && (
          <AIMessageActions
            messageContent={message.content}
            onRegenerate={isLast ? onRegenerate : undefined}
          />
        )}

        {!isUser && isLast && onSelectFollowUp && (
          <FollowUpChips
            messageContent={message.content}
            onSelectPrompt={onSelectFollowUp}
          />
        )}
      </View>
      {isUser && (
        <View style={mb.userAvatar}>
          <Text style={mb.userAvatarText}>👤</Text>
        </View>
      )}
    </Animated.View>
  );
}

const mb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.md, marginBottom: Spacing.md, gap: Spacing.xs },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  aiAvatarText: { fontSize: 14 },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '25',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  userAvatarText: { fontSize: 14 },
  bubble: { borderRadius: Radius.xl, padding: Spacing.md },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
    ...Shadow.sm,
  },
  aiBubble: {
    width: '88%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: Radius.xs,
    ...Shadow.sm,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  aiLabel: { color: Colors.primaryLight, fontSize: 10, fontWeight: Typography.weight.black, letterSpacing: 1.2 },
  userText: { color: Colors.white, fontSize: Typography.size.sm, lineHeight: 21, fontWeight: Typography.weight.medium },
  time: { fontSize: 10, marginTop: 4, fontWeight: Typography.weight.medium },
  timeLeft: { color: Colors.textMuted, alignSelf: 'flex-start' },
  timeRight: { color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end' },
});

// ── Conversation List Item ───────────────────────────────────────────────────────
function ConvoItem({
  convo,
  active,
  onPress,
  onDelete,
}: {
  convo: AIConversation;
  active: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const date = new Date(convo.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <View style={[ci.item, active && ci.itemActive]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [ci.itemMain, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <View style={[ci.iconWrap, active && ci.iconWrapActive]}>
          <Text style={ci.icon}>💬</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ci.title, active && ci.titleActive]} numberOfLines={1}>
            {convo.title}
          </Text>
          <Text style={ci.date}>🕐 {date}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [ci.deleteBtn, pressed && { opacity: 0.6, transform: [{ scale: 0.9 }] }]}
        accessibilityLabel="Delete conversation"
      >
        <Text style={ci.deleteIcon}>🗑️</Text>
      </Pressable>
    </View>
  );
}

const ci = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.lg, marginBottom: 4, gap: Spacing.xs },
  itemActive: { backgroundColor: Colors.primarySubtle, borderWidth: 1, borderColor: Colors.primaryMuted },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '40',
  },
  icon: { fontSize: 14 },
  title: { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  titleActive: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },
  date: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.errorMuted, borderWidth: 1, borderColor: Colors.error + '25' },
  deleteIcon: { fontSize: 14 },
});

// ── Onboarding Category Cards ────────────────────────────────────────────────────
const ONBOARDING_CATEGORIES = [
  { title: 'Explain a concept', desc: 'Break down complex topics into simple terms', emoji: '💡', prompt: 'Explain a concept: ' },
  { title: 'Help with coding', desc: 'Code examples, debugging, and syntax tips', emoji: '💻', prompt: 'Help me write code for: ' },
  { title: 'Practice questions', desc: 'Test your understanding with exam questions', emoji: '🎯', prompt: 'Give me practice questions for: ' },
  { title: 'Study my notes', desc: 'Summaries, key takeaways, and key points', emoji: '📝', prompt: 'Summarize key points for: ' },
  { title: 'Prepare for an exam', desc: 'High-yield study plans and revision strategies', emoji: '📅', prompt: 'Help me prepare for an exam on: ' },
];

// ── Main Screen ──────────────────────────────────────────────────────────────────
export default function AIAssistantScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selected, setSelected] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'thinking' | 'typing'>('thinking');
  const [busy, setBusy] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [error, setError] = useState<AIErrorKind | null>(null);
  const [convoToDelete, setConvoToDelete] = useState<AIConversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const renameRef = useRef<TextInput>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getAIConversations();
      setConversations(data);
      if (data[0]) {
        setSelected(data[0]);
        setMessages(await getAIMessages(data[0].id));
      }
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadConversations(); }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, sending]);

  const selectConvo = async (convo: AIConversation) => {
    setSelected(convo);
    setShowSidebar(false);
    setError(null);
    setBusy(true);
    try {
      setMessages(await getAIMessages(convo.id));
    } catch (err) {
      if (isAuthError(err)) signOut(); else setError(parseAIError(err));
    } finally { setBusy(false); }
  };

  const newConvo = async () => {
    setBusy(true); setError(null); setShowSidebar(false);
    try {
      const convo = await createAIConversation('New Conversation');
      setConversations((p) => [convo, ...p]);
      setSelected(convo); setMessages([]);
    } catch (err) {
      if (isAuthError(err)) signOut(); else setError(parseAIError(err));
    } finally { setBusy(false); }
  };

  const sendQuery = async (queryText: string) => {
    if (sending || !queryText.trim()) return;
    const content = queryText.trim();
    setLastUserPrompt(content);
    setDraft('');
    setSending(true);
    setLoadingStage('thinking');
    setError(null);

    // Optimistically show the user's message immediately in chat list
    const tempUserMsg: AIMessage = {
      id: Date.now(),
      conversation_id: selected?.id || 0,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === 'user' && lastMsg.content === content) {
        return prev;
      }
      return [...prev, tempUserMsg];
    });

    // Multi-stage loading state simulation (Thinking... -> Typing...)
    const typingTimer = setTimeout(() => {
      setLoadingStage('typing');
    }, 700);

    try {
      let currentConvo = selected;
      if (!currentConvo) {
        const title = content.length > 25 ? content.substring(0, 25) + '…' : content;
        currentConvo = await createAIConversation(title);
        setConversations((p) => [currentConvo!, ...p]);
        setSelected(currentConvo);
      }
      const updatedMsgs = await sendAIMessage(currentConvo.id, content);
      setMessages(updatedMsgs);
    } catch (err) {
      if (isAuthError(err)) signOut(); else setError(parseAIError(err));
    } finally {
      clearTimeout(typingTimer);
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (sending || busy || !lastUserPrompt) return;
    await sendQuery(lastUserPrompt);
  };

  const saveRename = async () => {
    if (!selected || !renameDraft.trim()) { setRenaming(false); return; }
    setBusy(true);
    try {
      const updated = await renameAIConversation(selected.id, renameDraft.trim());
      setSelected(updated);
      setConversations((p) => p.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      if (isAuthError(err)) signOut();
    } finally { setBusy(false); setRenaming(false); setRenameDraft(''); }
  };

  const handleDeleteConversation = (targetConvo?: AIConversation | null) => {
    const target = targetConvo || selected;
    if (!target || busy || deleting) return;
    setConvoToDelete(target);
  };

  const confirmDeleteConversation = async () => {
    if (!convoToDelete || busy || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAIConversation(convoToDelete.id);
      const targetId = convoToDelete.id;
      const remaining = conversations.filter((c) => c.id !== targetId);
      setConversations(remaining);
      if (selected?.id === targetId) {
        const next = remaining[0] ?? null;
        setSelected(next);
        if (next) {
          setMessages(await getAIMessages(next.id));
        } else {
          setMessages([]);
        }
      }
      setConvoToDelete(null);
    } catch (err) {
      if (isAuthError(err)) signOut(); else setError(parseAIError(err));
    } finally { setDeleting(false); }
  };

  const handleBack = () => {
    if (showSidebar) {
      setShowSidebar(false);
    } else {
      router.back();
    }
  };

  const hasMsgs = messages.length > 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink} pointerEvents="none" />
      <View style={s.blobTeal} pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Top bar ── */}
          <View style={s.topBar}>
            {/* Back */}
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={({ pressed }) => [s.topIconBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={s.topBackIcon}>←</Text>
            </Pressable>

            {/* Title (tappable to rename) */}
            <View style={s.topCenter}>
              {renaming ? (
                <TextInput
                  ref={renameRef}
                  value={renameDraft}
                  onChangeText={setRenameDraft}
                  onSubmitEditing={saveRename}
                  onBlur={() => { setRenaming(false); setRenameDraft(''); }}
                  placeholder="Conversation name…"
                  placeholderTextColor={Colors.textMuted}
                  style={s.renameInput}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <Pressable
                  onPress={() => {
                    if (selected) { setRenameDraft(selected.title); setRenaming(true); }
                  }}
                  disabled={!selected}
                  hitSlop={8}
                >
                  <Text style={s.topTitle} numberOfLines={1}>
                    {selected ? `💬 ${selected.title}` : '✨ Learnova AI'}
                  </Text>
                  {selected && <Text style={s.topHint}>Tap to rename</Text>}
                </Pressable>
              )}
            </View>

            {/* Right actions */}
            <View style={s.topRight}>
              {selected && messages.length > 0 && (
                <Pressable
                  onPress={() => handleDeleteConversation(selected)}
                  hitSlop={8}
                  style={({ pressed }) => [s.deleteIconBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
                  accessibilityLabel="Delete conversation"
                >
                  <Text style={s.deleteIcon}>🗑️</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setShowSidebar((v) => !v)}
                hitSlop={8}
                style={({ pressed }) => [s.topIconBtn, s.topIconBtnFilled, pressed && { opacity: 0.8 }]}
                accessibilityLabel="Conversations"
              >
                <Text style={s.menuIcon}>☰</Text>
                {conversations.length > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{Math.min(conversations.length, 9)}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => void newConvo()}
                style={({ pressed }) => [s.newBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
                accessibilityRole="button"
                accessibilityLabel="New conversation"
              >
                <Text style={s.newBtnIcon}>+</Text>
                <Text style={s.newBtnText}>New</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Conversations dropdown ── */}
          {showSidebar && (
            <View style={s.sidebar}>
              <Text style={s.sidebarLabel}>💬 CONVERSATIONS</Text>
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {conversations.length === 0 ? (
                  <Text style={s.sidebarEmpty}>No conversations yet.</Text>
                ) : (
                  conversations.map((c) => (
                    <ConvoItem
                      key={c.id}
                      convo={c}
                      active={selected?.id === c.id}
                      onPress={() => void selectConvo(c)}
                      onDelete={() => handleDeleteConversation(c)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* ── User-friendly Error Banner ── */}
          {error && (
            <View style={s.errorBanner}>
              <View style={{ flex: 1 }}>
                <Text style={s.errorTitle}>Learnova AI</Text>
                <Text style={s.errorText}>{AI_ERROR_MESSAGES[error]}</Text>
              </View>
              {lastUserPrompt ? (
                <Pressable
                  onPress={() => void sendQuery(lastUserPrompt)}
                  style={s.retryBtn}
                >
                  <Text style={s.retryBtnText}>Try again</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setError(null)} hitSlop={8}>
                  <Text style={s.errorDismiss}>✕</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Messages area ── */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={Colors.primaryLight} size="large" />
              <Text style={s.centerText}>Loading conversations…</Text>
            </View>
          ) : !selected ? (
            /* Welcome state */
            <View style={s.welcomeWrap}>
              <View style={s.welcomeIcon}>
                <Text style={s.welcomeIconText}>✨</Text>
              </View>
              <Text style={s.welcomeTitle}>Learnova AI</Text>
              <Text style={s.welcomeDesc}>
                Your academic learning tutor. Ask concepts, code, summaries, or study plans.
              </Text>
              <Pressable
                onPress={() => void newConvo()}
                style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
              >
                <Text style={s.startBtnText}>✨ Start a Conversation</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={s.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Empty chat onboarding cards */}
              {!hasMsgs && !sending && (
                <View style={s.chatWelcome}>
                  <View style={s.chatWelcomeIcon}>
                    <Text style={{ fontSize: 28 }}>✨</Text>
                  </View>
                  <Text style={s.chatWelcomeTitle}>What would you like to learn today?</Text>
                  <Text style={s.chatWelcomeSub}>
                    Select a topic category below or ask any academic question to start.
                  </Text>
                  <View style={s.categoriesGrid}>
                    {ONBOARDING_CATEGORIES.map((cat, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          setDraft(cat.prompt);
                          inputRef.current?.focus();
                        }}
                        style={({ pressed }) => [s.categoryCard, pressed && s.cardPressed]}
                      >
                        <Text style={s.categoryEmoji}>{cat.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.categoryTitle}>{cat.title}</Text>
                          <Text style={s.categoryDesc}>{cat.desc}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {messages.map((m, idx) => {
                const isLastAssistant = !sending && m.role === 'assistant' && idx === messages.length - 1;
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    index={idx}
                    isLast={isLastAssistant}
                    onRegenerate={handleRegenerate}
                    onSelectFollowUp={(prompt) => void sendQuery(prompt)}
                  />
                );
              })}
              {sending && <TypingDots stage={loadingStage} />}
            </ScrollView>
          )}

          {/* ── Composer ── */}
          {!loading && (
            <View
              style={[
                s.composer,
                { marginBottom: Math.max(96, insets.bottom + 88) },
              ]}
            >
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="Message Learnova AI…"
                placeholderTextColor={Colors.textMuted}
                style={s.composerInput}
                multiline
                editable={!sending && !busy}
                returnKeyType="default"
                maxLength={2000}
              />
              <Pressable
                onPress={() => void sendQuery(draft)}
                disabled={sending || !draft.trim()}
                style={({ pressed }) => [
                  s.sendBtn,
                  (!draft.trim() || sending) && s.sendBtnDisabled,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {sending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={s.sendIcon}>↑</Text>
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Modules" onNavigate={(r) => router.push(r as never)} />

      <DeleteConfirmModal
        visible={!!convoToDelete}
        title="Delete Conversation?"
        itemTitle={convoToDelete?.title}
        description="Are you sure you want to delete this conversation? This action cannot be undone and all message history will be permanently lost."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={() => void confirmDeleteConversation()}
        onClose={() => setConvoToDelete(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50, left: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink: { position: 'absolute', top: 140, right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal: { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: '#0EA5A00A' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  topCenter: { flex: 1, minWidth: 0, paddingHorizontal: Spacing.xs },
  topTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black },
  topHint: { color: Colors.textMuted, fontSize: 9, marginTop: 2, fontWeight: Typography.weight.medium },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  topIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
  topIconBtnFilled: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  topBackIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  deleteIconBtn: {
    width: 36, height: 36, borderRadius: Radius.lg,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1, borderColor: Colors.error + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteIcon: { fontSize: 16 },
  menuIcon: { fontSize: 18, color: Colors.textSecondary, fontWeight: Typography.weight.bold },
  badge: {
    position: 'absolute', top: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: Typography.weight.black },
  newBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    ...Shadow.md,
  },
  newBtnIcon: { color: Colors.white, fontSize: 16, fontWeight: Typography.weight.black },
  newBtnText: { color: Colors.white, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  renameInput: {
    color: Colors.textPrimary, fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    backgroundColor: Colors.surface, borderWidth: 1.5,
    borderColor: Colors.primary + '60', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },

  // Sidebar
  sidebar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  sidebarLabel: {
    color: Colors.textMuted, fontSize: 10, fontWeight: Typography.weight.black,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  sidebarEmpty: { color: Colors.textMuted, fontSize: Typography.size.sm, fontStyle: 'italic', paddingVertical: Spacing.md },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.errorMuted, borderBottomWidth: 1,
    borderBottomColor: Colors.error + '40',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  errorTitle: { color: Colors.errorLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  errorText: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 1 },
  retryBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.md,
  },
  retryBtnText: { color: Colors.white, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  errorDismiss: { color: Colors.error, fontSize: 16, fontWeight: Typography.weight.bold },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  centerText: { color: Colors.textMuted, fontSize: Typography.size.sm },

  // Welcome
  welcomeWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'], gap: Spacing.lg,
  },
  welcomeIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.lg,
  },
  welcomeIconText: { fontSize: 32 },
  welcomeTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, textAlign: 'center' },
  welcomeDesc: { color: Colors.textMuted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 22 },
  startBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  startBtnText: { color: Colors.white, fontWeight: Typography.weight.black, fontSize: Typography.size.base },

  // Messages
  messagesContent: { paddingTop: Spacing.lg, paddingBottom: 160 },

  // Empty chat onboarding cards
  chatWelcome: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  chatWelcomeIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1.5, borderColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  chatWelcomeTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, textAlign: 'center', fontWeight: Typography.weight.bold },
  chatWelcomeSub: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.xs },
  categoriesGrid: { gap: Spacing.sm, width: '100%' },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  cardPressed: {
    opacity: 0.8,
    backgroundColor: Colors.surfaceAlt,
    transform: [{ scale: 0.98 }],
  },
  categoryEmoji: { fontSize: 22 },
  categoryTitle: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  categoryDesc: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },

  // Composer
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    zIndex: 10,
  },
  composerInput: {
    flex: 1, minHeight: 44, maxHeight: 130,
    color: Colors.textPrimary,
    backgroundColor: Colors.bg,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius['2xl'],
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.size.sm, lineHeight: 20,
    outlineStyle: 'none' as any,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    ...Shadow.md,
  },
  sendBtnDisabled: { backgroundColor: Colors.surfacePressed, shadowOpacity: 0 },
  sendIcon: { color: Colors.white, fontSize: 22, fontWeight: Typography.weight.black },
});
