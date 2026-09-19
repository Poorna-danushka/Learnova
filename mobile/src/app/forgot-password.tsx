import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '@/services/api/userApi';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { LearnovaIcon } from '@/components/LearnovaIcon';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [focused, setFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successBounce = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 600, 
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web' 
      }),
      Animated.spring(slideAnim, { 
        toValue: 0, 
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web' 
      }),
    ]).start();
  }, []);

  // Success badge animation
  useEffect(() => {
    if (sent) {
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.sequence([
          Animated.timing(successBounce, {
            toValue: -10,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.spring(successBounce, {
            toValue: 0,
            friction: 3,
            tension: 40,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ]).start();
    } else {
      successScale.setValue(0);
      successBounce.setValue(0);
    }
  }, [sent]);

  // Loading spinner
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [loading]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const submit = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await forgotPassword(email.trim());
      setMessage(res.message);
      setSent(true);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'Unable to send reset instructions. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background glows */}
      <View style={s.glowA} pointerEvents="none" />
      <View style={s.glowB} pointerEvents="none" />

      {/* Floating back button */}
      <SafeAreaView style={s.safeTop} edges={['top']}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={s.backBtn}
          accessibilityRole="button"
        >
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Back</Text>
        </Pressable>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[s.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* Header */}
            <View style={s.header}>
              <LearnovaIcon size={72} />
              
              {!sent ? (
                <>
                  <Text style={s.headline}>Forgot password?</Text>
                  <Text style={s.subtext}>
                    No worries! Enter your email and we'll send you{'\n'}a link to reset your password.
                  </Text>
                </>
              ) : (
                <>
                  <Animated.View 
                    style={[
                      s.successBadge,
                      { 
                        transform: [
                          { scale: successScale },
                          { translateY: successBounce }
                        ] 
                      }
                    ]}
                  >
                    <Text style={s.successIcon}>✓</Text>
                  </Animated.View>
                  <Text style={s.headline}>Check your inbox</Text>
                  <Text style={s.subtext}>
                    We sent a password reset link to{'\n'}
                    <Text style={s.emailHighlight}>{email}</Text>
                  </Text>
                </>
              )}
            </View>

            {/* Form card */}
            <View style={s.card}>
              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorDot}>●</Text>
                  <Text style={s.errorText}>{error}</Text>
                  <Pressable onPress={() => setError(null)} hitSlop={8}>
                    <Text style={s.errorClose}>✕</Text>
                  </Pressable>
                </View>
              )}

              {!sent ? (
                <>
                  {/* Email input */}
                  <View style={s.fieldGroup}>
                    <Text style={s.label}>Email address</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@university.edu"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={submit}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      style={[
                        s.input,
                        focused && s.inputFocused,
                        error && s.inputError,
                      ]}
                    />
                  </View>

                  {/* Tips */}
                  <View style={s.tipsBox}>
                    <Text style={s.tipsTitle}>Can't find the email?</Text>
                    {['Check your spam folder', 'Make sure the email is correct', 'Wait a few minutes before retrying'].map((tip) => (
                      <View key={tip} style={s.tipRow}>
                        <Text style={s.tipDot}>·</Text>
                        <Text style={s.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Submit button */}
                  <Pressable
                    onPress={submit}
                    disabled={loading}
                    style={({ pressed }) => [
                      s.submitBtn,
                      loading && s.submitBtnBusy,
                      pressed && s.submitBtnPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={s.submitInner}>
                      {loading ? (
                        <>
                          <Animated.View 
                            style={[
                              s.spinner,
                              { transform: [{ rotate: spin }] }
                            ]} 
                          />
                          <Text style={s.submitText}>Sending…</Text>
                        </>
                      ) : (
                        <>
                          <Text style={s.submitText}>Send Reset Link</Text>
                          <Text style={s.submitArrow}>→</Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Success state actions */}
                  <View style={s.successActions}>
                    <Text style={s.successNote}>
                      Didn't receive it? Check spam or try again.
                    </Text>
                    <Pressable
                      onPress={() => { setSent(false); setMessage(null); setError(null); }}
                      style={({ pressed }) => [s.resendBtn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                    >
                      <Text style={s.resendText}>Resend email</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <Pressable
              onPress={() => router.replace('/login')}
              style={({ pressed }) => [s.footerLink, pressed && { opacity: 0.7 }]}
              accessibilityRole="link"
            >
              <Text style={s.footerLinkText}>← Back to sign in</Text>
            </Pressable>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // Background glows
  glowA: {
    position: 'absolute', top: -100, left: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: Colors.primary + '14',
  },
  glowB: {
    position: 'absolute', top: 120, right: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: Colors.accent + '10',
  },

  // Floating back button
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm, marginLeft: Spacing.lg,
    backgroundColor: Colors.surface + 'DD',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    ...Shadow.xs,
  },
  backArrow: { color: Colors.textSecondary, fontSize: Typography.size.base },
  backLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  scroll: { 
    flexGrow: 1, 
    paddingHorizontal: Spacing.xl, 
    paddingTop: 90, 
    paddingBottom: Spacing['3xl'] 
  },
  body: { gap: Spacing['2xl'] },

  // Header
  header: { gap: Spacing.md, alignItems: 'center', paddingTop: Spacing.lg },
  headline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    textAlign: 'center',
  },
  subtext: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    color: Colors.primary,
    fontWeight: Typography.weight.bold,
  },

  // Success badge
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successMuted,
    borderWidth: 3,
    borderColor: Colors.success + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  successIcon: {
    color: Colors.success,
    fontSize: 32,
    fontWeight: Typography.weight.black,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.md,
  },

  // Error box
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1, borderColor: Colors.error + '50',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  errorDot:   { color: Colors.error, fontSize: 8, flexShrink: 0 },
  errorText:  { flex: 1, color: Colors.errorLight, fontSize: Typography.size.sm, lineHeight: 19 },
  errorClose: { color: Colors.error, fontSize: 12, fontWeight: Typography.weight.bold },

  // Field
  fieldGroup: { gap: Spacing.xs },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    marginLeft: 2,
  },
  input: {
    height: 52,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  inputFocused: { 
    borderColor: Colors.primary, 
    backgroundColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError:   { borderColor: Colors.error },

  // Tips box
  tipsBox: {
    backgroundColor: Colors.accentSubtle,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  tipsTitle: {
    color: Colors.accent,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    marginBottom: 4,
  },
  tipRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  tipDot:  { color: Colors.accent, fontSize: Typography.size.base, lineHeight: 20, width: 10 },
  tipText: { color: Colors.accent, fontSize: Typography.size.xs, lineHeight: 20, flex: 1 },

  // Submit button
  submitBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnBusy:    { opacity: 0.7 },
  submitBtnPressed: { opacity: 0.85, transform: [{ scale: 0.982 }] },
  submitInner:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  submitText: {
    color: Colors.white,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.3,
  },
  submitArrow: { color: Colors.white, fontSize: Typography.size.lg },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: Colors.white,
  },

  // Success actions
  successActions: { gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm },
  successNote: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.accentSubtle,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
  },
  resendText: {
    color: Colors.accent,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },

  // Footer
  footerLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  footerLinkText: {
    color: Colors.accent,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
});
