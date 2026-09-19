import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, updateCurrentUser } from '@/services/api/userApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { Avatar, BottomNav, Button, Divider, Field, ListRow, Message, SkeletonCard } from '@/components/ui';

type UserData = {
  full_name: string; email: string; university: string;
  degree: string; graduation_year: string;
  push_notifications_enabled: boolean;
  reminder_notifications_enabled: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [msg, setMsg]           = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [userData, setUserData] = useState<UserData>({
    full_name: '', email: '', university: '', degree: '', graduation_year: '',
    push_notifications_enabled: true, reminder_notifications_enabled: true,
  });
  const [form, setForm] = useState<UserData>({ ...userData });

  // Animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const academicAnim = useRef(new Animated.Value(0)).current;
  const notifAnim = useRef(new Animated.Value(0)).current;
  const accountAnim = useRef(new Animated.Value(0)).current;
  const saveSuccessAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        const d: UserData = {
          full_name: u.full_name, email: u.email,
          university: u.university ?? '', degree: u.degree ?? '',
          graduation_year: u.graduation_year?.toString() ?? '',
          push_notifications_enabled: u.push_notifications_enabled ?? true,
          reminder_notifications_enabled: u.reminder_notifications_enabled ?? true,
        };
        setUserData(d); setForm(d);
      })
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 401) signOut();
        else setMsg({ text: 'Unable to load your profile.', tone: 'error' });
      })
      .finally(() => setLoading(false));
  }, []);

  // Entrance animations
  useEffect(() => {
    if (!loading) {
      Animated.stagger(60, [
        Animated.spring(heroAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.spring(academicAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.spring(notifAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.spring(accountAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const save = async () => {
    if (!form.full_name.trim()) { setMsg({ text: 'Full name is required.', tone: 'error' }); return; }
    setSaving(true); setMsg(null);
    try {
      await updateCurrentUser({
        full_name: form.full_name.trim(),
        university: form.university.trim() || undefined,
        degree: form.degree.trim() || undefined,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
        push_notifications_enabled: form.push_notifications_enabled,
        reminder_notifications_enabled: form.reminder_notifications_enabled,
      });
      setUserData(form); setEditing(false);
      setMsg({ text: 'Profile updated successfully.', tone: 'success' });
      
      // Celebration animation
      saveSuccessAnim.setValue(0);
      Animated.sequence([
        Animated.spring(saveSuccessAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.delay(200),
        Animated.spring(saveSuccessAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) signOut();
      else setMsg({ text: 'Unable to update profile. Please try again.', tone: 'error' });
    } finally { setSaving(false); }
  };

  const updateNotif = async (key: 'push_notifications_enabled' | 'reminder_notifications_enabled', value: boolean) => {
    const prev = userData[key];
    setUserData((d) => ({ ...d, [key]: value }));
    setForm((d) => ({ ...d, [key]: value }));
    try { await updateCurrentUser({ [key]: value }); }
    catch {
      setUserData((d) => ({ ...d, [key]: prev }));
      setForm((d) => ({ ...d, [key]: prev }));
      setMsg({ text: 'Unable to update notification settings.', tone: 'error' });
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') { void signOut(); return; }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.blobGreen} pointerEvents="none" />
      <View style={s.blobPink}  pointerEvents="none" />
      <View style={s.blobTeal}  pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

            {/* Header row */}
            <View style={s.headerRow}>
              <Text style={s.pageTitle}>Profile</Text>
              {!loading && !editing && (
                <Pressable
                  onPress={() => { setEditing(true); setMsg(null); }}
                  style={s.editBtn}
                  accessibilityRole="button"
                >
                  <Text style={s.editBtnText}>Edit</Text>
                </Pressable>
              )}
            </View>

            {/* Avatar hero */}
            {loading ? (
              <View style={s.avatarSkeleton}>
                <View style={s.avatarCircleSkeleton} />
                <View style={{ gap: Spacing.sm, alignItems: 'center' }}>
                  <View style={[s.skeletonLine, { width: 140 }]} />
                  <View style={[s.skeletonLine, { width: 100, height: 12 }]} />
                </View>
              </View>
            ) : (
              <Animated.View
                style={[
                  s.avatarHero,
                  {
                    opacity: heroAnim,
                    transform: [
                      { translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                      { scale: heroAnim },
                    ],
                  },
                ]}
              >
                <View style={s.avatarGradient}>
                  <View style={s.avatarRing}>
                    <Avatar name={userData.full_name || '?'} size={88} color={Colors.primary} />
                    <Animated.View
                      style={[
                        s.successBadge,
                        {
                          opacity: saveSuccessAnim,
                          transform: [{ scale: saveSuccessAnim }],
                        },
                      ]}
                    >
                      <Text style={s.successBadgeIcon}>✓</Text>
                    </Animated.View>
                  </View>
                </View>
                <Text style={s.displayName}>{userData.full_name}</Text>
                <Text style={s.displayEmail}>{userData.email}</Text>
                {userData.university ? (
                  <View style={s.universityPill}>
                    <Text style={s.universityIcon}>🎓</Text>
                    <Text style={s.universityText}>{userData.university}</Text>
                  </View>
                ) : null}
              </Animated.View>
            )}

            {msg && <Message tone={msg.tone} onDismiss={() => setMsg(null)}>{msg.text}</Message>}

            {loading ? (
              <><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                {/* Academic info */}
                <Animated.View
                  style={[
                    s.section,
                    {
                      opacity: academicAnim,
                      transform: [{ translateY: academicAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                    },
                  ]}
                >
                  <View style={s.sectionHeader}>
                    <View style={s.sectionIconWrap}>
                      <Text style={s.sectionIcon}>📚</Text>
                    </View>
                    <Text style={s.sectionLabel}>Academic Information</Text>
                  </View>
                  <View style={s.card}>
                    {editing ? (
                      <>
                        <Field label="Full Name" value={form.full_name} onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))} returnKeyType="next" />
                        <Divider />
                        <Field label="University" placeholder="e.g. MIT" value={form.university} onChangeText={(v) => setForm((f) => ({ ...f, university: v }))} returnKeyType="next" />
                        <Divider />
                        <Field label="Degree / Program" placeholder="e.g. B.S. Computer Science" value={form.degree} onChangeText={(v) => setForm((f) => ({ ...f, degree: v }))} returnKeyType="next" />
                        <Divider />
                        <Field label="Graduation Year" placeholder="e.g. 2027" value={form.graduation_year} onChangeText={(v) => setForm((f) => ({ ...f, graduation_year: v }))} keyboardType="numeric" returnKeyType="done" />
                      </>
                    ) : (
                      <>
                        {[
                          { label: 'University',      value: userData.university || 'Not set', icon: '🏛️' },
                          { label: 'Degree / Program',value: userData.degree || 'Not set', icon: '🎓' },
                          { label: 'Graduation Year', value: userData.graduation_year || 'Not set', icon: '📅' },
                        ].map(({ label, value, icon }, i) => (
                          <View key={label}>
                            <View style={s.infoRow}>
                              <View style={s.infoLeft}>
                                <Text style={s.infoIcon}>{icon}</Text>
                                <Text style={s.infoLabel}>{label}</Text>
                              </View>
                              <Text style={[s.infoValue, !value.includes('Not') ? {} : s.infoValueEmpty]}>{value}</Text>
                            </View>
                            {i < 2 && <Divider />}
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                  {editing && (
                    <View style={s.editActions}>
                      <Button label="Cancel" onPress={() => { setForm(userData); setEditing(false); setMsg(null); }} variant="secondary" />
                      <Button label={saving ? 'Saving…' : 'Save Changes'} onPress={save} loading={saving} />
                    </View>
                  )}
                </Animated.View>

                {/* Notifications */}
                {!editing && (
                  <Animated.View
                    style={[
                      s.section,
                      {
                        opacity: notifAnim,
                        transform: [{ translateY: notifAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                      },
                    ]}
                  >
                    <View style={s.sectionHeader}>
                      <View style={s.sectionIconWrap}>
                        <Text style={s.sectionIcon}>🔔</Text>
                      </View>
                      <Text style={s.sectionLabel}>Notifications</Text>
                    </View>
                    <View style={s.card}>
                      <View style={s.switchRow}>
                        <View style={s.switchIconWrap}>
                          <Text style={s.switchEmoji}>📱</Text>
                        </View>
                        <View style={s.switchText}>
                          <Text style={s.switchTitle}>Push notifications</Text>
                          <Text style={s.switchSubtitle}>Study updates and reminders</Text>
                        </View>
                        <Switch
                          value={userData.push_notifications_enabled}
                          onValueChange={(v) => void updateNotif('push_notifications_enabled', v)}
                          trackColor={{ false: Colors.border, true: Colors.primary }}
                          thumbColor={Colors.white}
                          ios_backgroundColor={Colors.border}
                        />
                      </View>
                      <Divider />
                      <View style={s.switchRow}>
                        <View style={s.switchIconWrap}>
                          <Text style={s.switchEmoji}>⏰</Text>
                        </View>
                        <View style={s.switchText}>
                          <Text style={s.switchTitle}>Study reminders</Text>
                          <Text style={s.switchSubtitle}>Scheduled session alerts</Text>
                        </View>
                        <Switch
                          value={userData.reminder_notifications_enabled}
                          onValueChange={(v) => void updateNotif('reminder_notifications_enabled', v)}
                          trackColor={{ false: Colors.border, true: Colors.primary }}
                          thumbColor={Colors.white}
                          ios_backgroundColor={Colors.border}
                        />
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Account */}
                {!editing && (
                  <Animated.View
                    style={[
                      s.section,
                      {
                        opacity: accountAnim,
                        transform: [{ translateY: accountAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                      },
                    ]}
                  >
                    <View style={s.sectionHeader}>
                      <View style={s.sectionIconWrap}>
                        <Text style={s.sectionIcon}>⚙️</Text>
                      </View>
                      <Text style={s.sectionLabel}>Account</Text>
                    </View>
                    <View style={s.card}>
                      <Pressable
                        onPress={() => router.push('/notifications' as never)}
                        style={s.accountRow}
                        accessibilityRole="button"
                      >
                        <View style={s.accountLeft}>
                          <View style={[s.accountIconWrap, { backgroundColor: Colors.primary + '15' }]}>
                            <Text style={s.accountIcon}>📬</Text>
                          </View>
                          <Text style={s.accountLabel}>Notification Inbox</Text>
                        </View>
                        <Text style={s.accountChevron}>›</Text>
                      </Pressable>
                      <Divider />
                      <Pressable
                        onPress={handleSignOut}
                        style={s.accountRow}
                        accessibilityRole="button"
                      >
                        <View style={s.accountLeft}>
                          <View style={[s.accountIconWrap, { backgroundColor: Colors.error + '15' }]}>
                            <Text style={s.accountIcon}>🚪</Text>
                          </View>
                          <Text style={[s.accountLabel, s.accountLabelDanger]}>Sign Out</Text>
                        </View>
                        <Text style={[s.accountChevron, { color: Colors.error }]}>›</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                )}

                {/* App info */}
                {!editing && (
                  <View style={s.appInfo}>
                    <Text style={s.appName}>learnova</Text>
                    <Text style={s.appVersion}>Version 1.0.0 · Learn smarter, achieve more.</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Profile" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  blobGreen: { position: 'absolute', top: -50,  left: -70,  width: 200, height: 200, borderRadius: 100, backgroundColor: '#16A34A12' },
  blobPink:  { position: 'absolute', top: 140,  right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#BE185D0E' },
  blobTeal:  { position: 'absolute', bottom: 180, left: -60, width: 180, height: 180, borderRadius: 90,  backgroundColor: '#0EA5A00A' },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 120, gap: Spacing.xl },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle:  { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  editBtn:    { 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.sm, 
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.lg, 
    borderWidth: 1, 
    borderColor: Colors.primary + '30',
    ...Shadow.sm,
  },
  editBtnText:{ color: Colors.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  avatarSkeleton:      { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  avatarCircleSkeleton:{ width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.surfaceElevated },
  skeletonLine:        { height: 16, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm },

  avatarHero:    { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  avatarGradient: {
    position: 'relative',
    padding: Spacing.md,
    borderRadius: 60,
    backgroundColor: Colors.primary + '10',
  },
  avatarRing: {
    position: 'relative',
    padding: 4,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.surface,
    ...Shadow.md,
  },
  successBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success,
    borderWidth: 3,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  successBadgeIcon: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.weight.bold,
  },
  displayName:    { color: Colors.textPrimary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  displayEmail:   { color: Colors.textMuted, fontSize: Typography.size.sm },
  universityPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primary + '30',
    ...Shadow.sm,
  },
  universityIcon: { fontSize: 14 },
  universityText: { color: Colors.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  section:      { gap: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs, 
    fontWeight: Typography.weight.bold,
    letterSpacing: 1.5, 
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface, 
    borderRadius: Radius['2xl'],
    borderWidth: 1, 
    borderColor: Colors.border,
    padding: Spacing.lg, 
    gap: Spacing.md,
    ...Shadow.md,
  },

  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  infoLeft:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoIcon:      { fontSize: 16 },
  infoLabel:     { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  infoValue:     { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  infoValueEmpty:{ color: Colors.textMuted, fontStyle: 'italic', fontWeight: Typography.weight.regular },

  editActions: { flexDirection: 'row', gap: Spacing.md },

  switchRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
  switchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchEmoji:   { fontSize: 16 },
  switchText:    { flex: 1, gap: 3 },
  switchTitle:   { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  switchSubtitle:{ color: Colors.textMuted, fontSize: Typography.size.xs },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  accountIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountIcon: {
    fontSize: 18,
  },
  accountLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  accountLabelDanger: {
    color: Colors.error,
  },
  accountChevron: {
    color: Colors.textMuted,
    fontSize: 24,
    fontWeight: Typography.weight.regular,
  },

  appInfo:    { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xl },
  appName:    { color: Colors.textMuted, fontSize: Typography.size.lg, fontWeight: Typography.weight.black, letterSpacing: 1 },
  appVersion: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center' },
});
