import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
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

import {
  CalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from '@/services/api/calendarApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { BottomNav, Button, EmptyState, Field, Message, SkeletonCard } from '@/components/ui';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayAbbr(d: Date) { return d.toLocaleDateString([], { weekday: 'short' }); }

const GROUP_ORDER = ['Today', 'Tomorrow', 'This Week', 'Later'];

function groupEvents(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  const today = new Date(); const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(); weekEnd.setDate(today.getDate() + 7);
  events.forEach((e) => {
    const d = new Date(e.starts_at);
    const label = d.toDateString() === today.toDateString()    ? 'Today'
                : d.toDateString() === tomorrow.toDateString() ? 'Tomorrow'
                : d <= weekEnd                                 ? 'This Week'
                : 'Later';
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });
  return groups;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const fabScale = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (!loading && events.length > 0) {
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
  }, [loading, events.length]);

  // Form state
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));
  const [adding, setAdding]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setEvents(await getCalendarEvents(true));
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) signOut();
      else setError('Unable to load calendar.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveEvent = async () => {
    if (!title.trim()) { setFormError('Event title is required.'); return; }
    setAdding(true); setFormError(null);
    try {
      if (editing) {
        const updated = await updateCalendarEvent(editing.id, {
          title: title.trim(), description: description.trim() || undefined,
        });
        setEvents((p) => p.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        const start = new Date(`${selectedDay}T00:00:00`);
        const nextHour = new Date(Date.now() + 3600000);
        start.setHours(nextHour.getHours(), nextHour.getMinutes(), 0, 0);
        const end = new Date(start.getTime() + 1800000);
        const event = await createCalendarEvent({
          title: title.trim(), description: description.trim() || undefined,
          starts_at: start.toISOString(), ends_at: end.toISOString(),
          all_day: false, reminder_minutes: 15,
        });
        setEvents((p) => [...p, event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      }
      cancelForm();
      
      // FAB celebration animation
      Animated.sequence([
        Animated.spring(fabScale, { toValue: 1.2, friction: 4, tension: 40, useNativeDriver: true }),
        Animated.spring(fabScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else setFormError(editing ? 'Unable to update event.' : 'Unable to create event.');
    } finally { setAdding(false); }
  };

  const cancelForm = () => {
    setShowForm(false); setEditing(null);
    setTitle(''); setDescription(''); setSelectedDay(dayKey(new Date())); setFormError(null);
  };

  const startEdit = (event: CalendarEvent) => {
    setEditing(event); setTitle(event.title);
    setDescription(event.description || '');
    setSelectedDay(dayKey(new Date(event.starts_at)));
    setFormError(null); setShowForm(true);
  };

  const remove = (id: number, title: string) => {
    const del = async () => {
      try { await deleteCalendarEvent(id); setEvents((p) => p.filter((e) => e.id !== id)); }
      catch { setError('Unable to delete event.'); }
    };
    if (Platform.OS === 'web') { void del(); return; }
    Alert.alert('Delete event?', `"${title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void del() },
    ]);
  };

  const grouped = groupEvents(events);

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
            <Text style={s.pageTitle}>📅 Calendar</Text>
            <Text style={s.pageSubtitle}>{loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: fabScale }] }}>
            <Pressable
              onPress={() => setShowForm((v) => !v)}
              style={({ pressed }) => [s.addFab, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Add event"
            >
              <Text style={s.addFabIcon}>{showForm ? '−' : '+'}</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Stats Card */}
        {!loading && events.length > 0 && (
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
                <Text style={s.statIcon}>📅</Text>
              </View>
              <View>
                <Text style={s.statValue}>{events.length}</Text>
                <Text style={s.statLabel}>Total</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '30' }]}>
                <Text style={s.statIcon}>⏰</Text>
              </View>
              <View>
                <Text style={s.statValue}>{grouped['Today']?.length || 0}</Text>
                <Text style={s.statLabel}>Today</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIconWrap, { backgroundColor: Colors.info + '15', borderColor: Colors.info + '30' }]}>
                <Text style={s.statIcon}>📆</Text>
              </View>
              <View>
                <Text style={s.statValue}>{grouped['This Week']?.length || 0}</Text>
                <Text style={s.statLabel}>This Week</Text>
              </View>
            </View>
          </View>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={Colors.primaryLight} />
            }
          >
            {error && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}

            {/* Create / Edit Form */}
            {showForm && (
              <View style={s.formCard}>
                <View style={s.formHeader}>
                  <View style={s.formIconWrap}>
                    <Text style={s.formIcon}>{editing ? '✏️' : '📅'}</Text>
                  </View>
                  <Text style={s.formTitle}>{editing ? 'Edit Event' : 'New Event'}</Text>
                </View>
                {formError && <Message tone="error" onDismiss={() => setFormError(null)}>{formError}</Message>}

                <Field label="Event title" placeholder="e.g. Submit assignment" value={title} onChangeText={setTitle} returnKeyType="next" />
                <Field label="Description (optional)" placeholder="Any extra details…" value={description} onChangeText={setDescription} multiline returnKeyType="done" />

                {!editing && (
                  <View style={s.daySection}>
                    <Text style={s.dayLabel}>📆 Choose a day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayRow}>
                      {Array.from({ length: 7 }, (_, i) => {
                        const date = new Date();
                        date.setHours(0, 0, 0, 0);
                        date.setDate(date.getDate() + i);
                        const key = dayKey(date);
                        const sel = selectedDay === key;
                        return (
                          <Pressable
                            key={key}
                            onPress={() => setSelectedDay(key)}
                            style={({ pressed }) => [s.dayPill, sel && s.dayPillSelected, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
                            accessibilityRole="button"
                          >
                            <Text style={[s.dayPillLabel, sel && s.dayPillLabelSel]}>
                              {i === 0 ? 'Today' : dayAbbr(date)}
                            </Text>
                            <Text style={[s.dayPillNum, sel && s.dayPillLabelSel]}>{date.getDate()}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <View style={s.selectedDateBox}>
                      <Text style={s.selectedDateIcon}>📅</Text>
                      <Text style={s.daySelected}>
                        {new Date(`${selectedDay}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={s.formNote}>
                  <Text style={s.formNoteIcon}>💡</Text>
                  <Text style={s.formNoteText}>30-minute event · Reminder 15 min before</Text>
                </View>

                <View style={s.formActions}>
                  <Button label="Cancel" onPress={cancelForm} variant="ghost" size="sm" fullWidth={false} />
                  <Button label={editing ? 'Save Changes' : '✨ Add Event'} onPress={saveEvent} loading={adding} size="sm" fullWidth={false} />
                </View>
              </View>
            )}

            {/* Events */}
            {loading
              ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
              : events.length === 0
              ? <EmptyState icon="📅" title="Nothing scheduled" text="Add events and reminders to stay ahead of deadlines." action="📅 Add Event" onAction={() => setShowForm(true)} />
              : GROUP_ORDER.filter((g) => grouped[g]).map((group) => (
                <View key={group} style={s.group}>
                  <View style={s.groupHeader}>
                    <Text style={s.groupIcon}>
                      {group === 'Today' ? '🔥' : group === 'Tomorrow' ? '⏰' : group === 'This Week' ? '📆' : '📋'}
                    </Text>
                    <Text style={s.groupLabel}>{group}</Text>
                    <View style={s.groupBadge}>
                      <Text style={s.groupBadgeText}>{grouped[group].length}</Text>
                    </View>
                  </View>
                  {grouped[group].map((event, idx) => (
                    <Animated.View
                      key={event.id}
                      style={{
                        opacity: fadeAnim,
                        transform: [
                          { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                          { scale: scaleAnim },
                        ],
                      }}
                    >
                      <View style={s.eventCard}>
                        {/* Time column */}
                        <View style={[s.eventTimeCol, group === 'Today' && s.eventTimeColToday]}>
                          <Text style={s.eventTimeIcon}>🕐</Text>
                          <Text style={s.eventTime}>{fmtTime(event.starts_at)}</Text>
                        </View>
                        {/* Content */}
                        <View style={s.eventBody}>
                          <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
                          <Text style={s.eventDate}>📅 {fmtDateFull(event.starts_at)}</Text>
                          {event.description
                            ? <Text style={s.eventDesc} numberOfLines={2}>{event.description}</Text>
                            : null}
                          <View style={s.eventFooter}>
                            {event.reminder_minutes
                              ? <View style={s.reminderBadge}>
                                  <Text style={s.reminderIcon}>⏰</Text>
                                  <Text style={s.reminderText}>{event.reminder_minutes} min</Text>
                                </View>
                              : null}
                            <View style={s.eventActions}>
                              <Pressable 
                                onPress={() => startEdit(event)} 
                                hitSlop={8}
                                style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }]}
                              >
                                <Text style={s.editText}>✏️ Edit</Text>
                              </Pressable>
                              <Pressable 
                                onPress={() => remove(event.id, event.title)} 
                                hitSlop={8}
                                style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }]}
                              >
                                <Text style={s.deleteText}>🗑️ Delete</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              ))
            }
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Planner" onNavigate={(r) => router.push(r as never)} />
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
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.md,
  },
  pageTitle:   { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  pageSubtitle:{ color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: 2 },
  addFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  addFabIcon: { color: Colors.white, fontSize: 26, fontWeight: Typography.weight.black, lineHeight: 28 },

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

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.lg },

  // Form card
  formCard: {
    backgroundColor: Colors.surface, borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.md,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  formIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formIcon: { fontSize: 20 },
  formTitle:  { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  formNote:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.infoMuted, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.info + '30' },
  formNoteIcon: { fontSize: 16 },
  formNoteText: { color: Colors.infoLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium, flex: 1 },
  formActions:{ flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },

  daySection: { gap: Spacing.sm },
  dayLabel:   { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  dayRow:     { gap: Spacing.sm, paddingVertical: 4 },
  dayPill: {
    width: 60, alignItems: 'center', gap: 4, paddingVertical: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  dayPillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary, ...Shadow.md },
  dayPillLabel:    { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  dayPillLabelSel: { color: Colors.white },
  dayPillNum:      { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  selectedDateBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primarySubtle, borderRadius: Radius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primaryMuted },
  selectedDateIcon: { fontSize: 14 },
  daySelected:     { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, flex: 1 },

  // Event groups
  group:      { gap: Spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  groupIcon: { fontSize: 16 },
  groupLabel: {
    color: Colors.textPrimary, fontSize: Typography.size.sm,
    fontWeight: Typography.weight.black, letterSpacing: 0.5, flex: 1,
  },
  groupBadge: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    minWidth: 24,
    alignItems: 'center',
  },
  groupBadgeText: { color: Colors.primaryLight, fontSize: 11, fontWeight: Typography.weight.black },

  // Event card
  eventCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'], borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  eventTimeCol: {
    width: 68, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, gap: 4,
    backgroundColor: Colors.primarySubtle,
    borderRightWidth: 1,
    borderRightColor: Colors.primaryMuted,
  },
  eventTimeColToday: {
    backgroundColor: Colors.warning + '20',
    borderRightColor: Colors.warning + '40',
  },
  eventTimeIcon: { fontSize: 16 },
  eventTime:  { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
  eventBody:  { flex: 1, padding: Spacing.md, gap: 6 },
  eventTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.black, lineHeight: 22 },
  eventDate:  { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  eventDesc:  { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  eventFooter:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs, gap: Spacing.sm },
  reminderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.warningMuted, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: Colors.warning + '40' },
  reminderIcon: { fontSize: 12 },
  reminderText: { color: Colors.warning, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  eventActions: { flexDirection: 'row', gap: Spacing.xs },
  editBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.infoMuted, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.info + '30',
  },
  editText:   { color: Colors.info, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  deleteBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.errorMuted, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.error + '30',
  },
  deleteText: { color: Colors.error, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
});
