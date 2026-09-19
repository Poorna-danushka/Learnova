import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import axios from 'axios';

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationHistoryItem,
} from '@/services/api/notificationHistoryApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { BottomNav, Message } from '@/components/ui';

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const router  = useRouter();
  const { signOut } = useAuth();
  const [items, setItems]       = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getNotifications({ limit: 50 });
      setItems(res.items);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (item: NotificationHistoryItem) => {
    if (item.is_read) return;
    try {
      const updated = await markNotificationAsRead(item.id);
      setItems((cur) => cur.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((cur) => cur.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() })));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Unable to update notifications.');
    }
  };

  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={s.backBtn}
              accessibilityRole="button"
            >
              <Text style={s.backArrow}>←</Text>
            </Pressable>
            <View>
              <View style={s.titleRow}>
                <Text style={s.pageTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={s.pageSubtitle}>Stay up to date with your study activity.</Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={() => void markAllRead()}
              style={s.markAllBtn}
              accessibilityRole="button"
            >
              <Text style={s.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={Colors.primaryLight}
            />
          }
        >
          {error && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={Colors.primaryLight} size="large" />
            </View>
          ) : items.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Text style={s.emptyIcon}>✓</Text>
              </View>
              <Text style={s.emptyTitle}>You're all caught up</Text>
              <Text style={s.emptyText}>New reminders and study updates will appear here.</Text>
            </View>
          ) : (
            <>
              {/* Group: Unread */}
              {items.filter((i) => !i.is_read).length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>Unread</Text>
                  {items.filter((i) => !i.is_read).map((item) => (
                    <NotifCard key={item.id} item={item} onPress={() => void markRead(item)} />
                  ))}
                </View>
              )}

              {/* Group: Read */}
              {items.filter((i) => i.is_read).length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>Earlier</Text>
                  {items.filter((i) => i.is_read).map((item) => (
                    <NotifCard key={item.id} item={item} onPress={() => {}} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomNav active="Profile" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

function NotifCard({ item, onPress }: { item: NotificationHistoryItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        !item.is_read && s.cardUnread,
        pressed && { opacity: 0.78 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.is_read ? '' : ', unread'}`}
    >
      <View style={[s.dot, !item.is_read && s.dotUnread]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.cardTitle, !item.is_read && s.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.cardTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.cardText} numberOfLines={2}>{item.body}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerLeft:  { flex: 1, gap: Spacing.md },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  backArrow:   { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pageTitle:   { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  pageSubtitle:{ color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: 2 },
  unreadBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  unreadBadgeText: { color: Colors.white, fontSize: 11, fontWeight: Typography.weight.black },
  markAllBtn:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  markAllText: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.xl },
  center: { paddingVertical: Spacing['4xl'], alignItems: 'center' },

  emptyWrap:   { alignItems: 'center', paddingVertical: Spacing['4xl'], gap: Spacing.md },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.successMuted, borderWidth: 1, borderColor: Colors.success + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  emptyIcon:  { color: Colors.successLight, fontSize: 26, fontWeight: Typography.weight.black },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  emptyText:  { color: Colors.textMuted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.xl },

  group:      { gap: Spacing.sm },
  groupLabel: {
    color: Colors.textMuted, fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold, letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  card: {
    flexDirection: 'row', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'flex-start',
    ...Shadow.xs,
  },
  cardUnread: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.primary + '50',
  },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border, marginTop: 7, flexShrink: 0 },
  dotUnread:{ backgroundColor: Colors.primaryLight },
  cardBody: { flex: 1, gap: 4 },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardTitle:{ color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, flex: 1 },
  cardTitleUnread: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },
  cardText: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 19 },
  cardTime: { color: Colors.textMuted, fontSize: 10, flexShrink: 0, marginTop: 2 },
});
