import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  View,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '@/services/api/userApi';
import { Button, Field, Message, PasswordField } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ token?: string }>();
  const [token, setToken]           = useState(params.token ?? '');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [message, setMessage]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  // Success animation
  useEffect(() => {
    if (success) {
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.sequence([
          Animated.timing(successBounce, {
            toValue: -12,
            duration: 350,
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
    }
  }, [success]);

  const submit = async () => {
    if (!token.trim())        { setError('Please enter your reset token.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await resetPassword(token.trim(), password);
      setMessage(res.message);
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.status === 400
          ? 'This reset link is invalid or has expired.'
          : 'Unable to reset your password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Background glows */}
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Back */}
            <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconText}>🔒</Text>
            </View>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Choose a strong new password for your Learnova account.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error   && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}
            {message && <Message tone="success">{message}</Message>}

            {success ? (
              <View style={styles.successState}>
                <Animated.View 
                  style={[
                    styles.successIconWrap,
                    {
                      transform: [
                        { scale: successScale },
                        { translateY: successBounce }
                      ]
                    }
                  ]}
                >
                  <Text style={styles.successIcon}>✓</Text>
                </Animated.View>
                <Text style={styles.successTitle}>Password updated!</Text>
                <Text style={styles.successText}>Redirecting you to sign in…</Text>
              </View>
            ) : (
              <>
                {!params.token && (
                  <Field
                    label="Reset token"
                    placeholder="Paste the token from your email"
                    autoCapitalize="none"
                    value={token}
                    onChangeText={setToken}
                    returnKeyType="next"
                  />
                )}
                <PasswordField
                  label="New password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChangeText={setPassword}
                />
                <PasswordField
                  label="Confirm new password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChangeText={setConfirm}
                />
                <Button
                  label={loading ? 'Updating…' : 'Reset Password'}
                  onPress={submit}
                  loading={loading}
                  size="lg"
                />
              </>
            )}
          </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },

  // Background glows
  glowA: {
    position: 'absolute', top: -100, left: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: Colors.primary + '18',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
  },
  glowB: {
    position: 'absolute', top: 140, right: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: Colors.accent + '12',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },

  backBtn:  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.xs, 
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface + 'DD',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  backArrow:{ color: Colors.textSecondary, fontSize: Typography.size.base },
  backLabel:{ color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  header: { gap: Spacing.md, paddingTop: Spacing.sm, alignItems: 'center' },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: { fontSize: 32 },
  title:    { 
    color: Colors.textPrimary, 
    fontSize: Typography.size['3xl'], 
    fontWeight: Typography.weight.black, 
    letterSpacing: Typography.tracking.tight,
    textAlign: 'center',
  },
  subtitle: { 
    color: Colors.textMuted, 
    fontSize: Typography.size.base, 
    lineHeight: 24,
    textAlign: 'center',
  },

  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  successState: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successMuted,
    borderWidth: 3,
    borderColor: Colors.success + '50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  successIcon:  { color: Colors.success, fontSize: 32, fontWeight: Typography.weight.black },
  successTitle: { 
    color: Colors.textPrimary, 
    fontSize: Typography.size.xl, 
    fontWeight: Typography.weight.black,
    marginTop: Spacing.sm,
  },
  successText:  { 
    color: Colors.textMuted, 
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
});
