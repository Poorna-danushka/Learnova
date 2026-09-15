import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead, NotificationHistoryItem } from '@/services/api/notificationHistoryApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { BottomNav, Button, Message } from '@/components/ui';

export default function NotificationsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await getNotifications({ limit: 50 });
      setItems(response.items);
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
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((current) => current.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() })));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setError('Unable to update notifications.');
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Stay up to date with your study activity.</Text>
          </View>
          <Button label="Mark all read" onPress={() => { void markAllRead(); }} variant="ghost" size="sm" />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        >
          {error && <Message tone="error">{error}</Message>}
          {loading ? (
            <ActivityIndicator color={Colors.primaryLight} />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
              <Text style={styles.emptyText}>New reminders and study updates will appear here.</Text>
            </View>
          ) : items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => { void markRead(item); }}
              style={[styles.card, !item.is_read && styles.unread]}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}${item.is_read ? '' : ', unread'}`}
            >
              <View style={[styles.dot, !item.is_read && styles.dotUnread]} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
      <BottomNav active="Profile" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  header: { padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  title: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black },
  subtitle: { color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: Spacing.xs },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md, paddingBottom: 110 },
  card: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border },
  unread: { borderColor: Colors.primary, backgroundColor: Colors.surfaceAlt },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: Colors.border },
  dotUnread: { backgroundColor: Colors.primaryLight },
  cardBody: { flex: 1, gap: Spacing.xs },
  cardTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  cardText: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  time: { color: Colors.textMuted, fontSize: Typography.size.xs },
  empty: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm },
  emptyIcon: { color: Colors.success, fontSize: 42 },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  emptyText: { color: Colors.textMuted, textAlign: 'center', fontSize: Typography.size.sm },
});
