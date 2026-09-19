import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resendVerification, verifyEmail } from '@/services/api/userApi';
import { Button, Field, Message } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token, email: emailParam } = useLocalSearchParams<{ token?: string; email?: string }>();
  const [email, setEmail]     = useState(emailParam ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>(token ? 'verifying' : 'idle');

  useEffect(() => {
    if (!token) return;
    setVerifyState('verifying');
    verifyEmail(token)
      .then((res) => {
        setMessage(res.message);
        setVerifyState('success');
      })
      .catch((err: unknown) => {
        setError(
          axios.isAxiosError(err) && err.response?.status === 400
            ? 'This verification link is invalid or has expired.'
            : 'Unable to verify your email. Please try again.'
        );
        setVerifyState('error');
      });
  }, [token]);

  const resend = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setResending(true);
    setError(null);
    try {
      const res = await resendVerification(email.trim());
      setMessage(res.message);
    } catch {
      setError('Unable to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <View
              style={[
                styles.iconWrap,
                verifyState === 'success' && styles.iconWrapSuccess,
                verifyState === 'error'   && styles.iconWrapError,
              ]}
            >
              {verifyState === 'verifying' ? (
                <ActivityIndicator color={Colors.primaryLight} size="small" />
              ) : verifyState === 'success' ? (
                <Text style={[styles.iconText, { color: Colors.successLight }]}>✓</Text>
              ) : verifyState === 'error' ? (
                <Text style={[styles.iconText, { color: Colors.errorLight }]}>!</Text>
              ) : (
                <Text style={styles.iconText}>✉</Text>
              )}
            </View>
            <Text style={styles.title}>
              {verifyState === 'verifying' ? 'Verifying…'
               : verifyState === 'success'  ? 'Email verified!'
               : 'Verify your email'}
            </Text>
            <Text style={styles.subtitle}>
              {verifyState === 'success'
                ? 'Your account is confirmed. You can now sign in.'
                : 'Check your inbox and confirm your email address to activate your account.'}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.form}>
            {error   && <Message tone="error" onDismiss={() => setError(null)}>{error}</Message>}
            {message && <Message tone="success">{message}</Message>}

            {verifyState === 'success' ? (
              <Button label="Go to Sign In" onPress={() => router.replace('/login')} size="lg" />
            ) : (
              <>
                {/* Checklist hint */}
                <View style={styles.hintBox}>
                  <Text style={styles.hintTitle}>Didn't receive it?</Text>
                  {[
                    'Check your spam or junk folder',
                    'Make sure the email address is correct',
                    'Wait a few minutes, then try resending',
                  ].map((hint) => (
                    <View key={hint} style={styles.hintRow}>
                      <Text style={styles.hintDot}>·</Text>
                      <Text style={styles.hintText}>{hint}</Text>
                    </View>
                  ))}
                </View>

                <Field
                  label="Email address"
                  placeholder="student@university.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="done"
                  onSubmitEditing={resend}
                />
                <Button
                  label={resending ? 'Sending…' : 'Resend Verification Email'}
                  onPress={resend}
                  loading={resending}
                  size="lg"
                />
              </>
            )}
          </View>

          {/* Footer */}
          <Pressable
            onPress={() => router.replace('/login')}
            style={styles.footerLink}
            accessibilityRole="link"
          >
            <Text style={styles.footerLinkText}>← Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },

  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start' },
  backArrow:{ color: Colors.primaryLight, fontSize: Typography.size.lg, lineHeight: 24 },
  backLabel:{ color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  header: { gap: Spacing.md, paddingTop: Spacing.sm, alignItems: 'flex-start' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  iconWrapSuccess: { backgroundColor: Colors.successMuted, borderColor: Colors.success + '40' },
  iconWrapError:   { backgroundColor: Colors.errorMuted,   borderColor: Colors.error   + '40' },
  iconText: { color: Colors.primaryLight, fontSize: 24 },
  title:    { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  subtitle: { color: Colors.textMuted, fontSize: Typography.size.base, lineHeight: 24 },

  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  hintBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  hintTitle: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  hintRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  hintDot:   { color: Colors.textMuted, fontSize: Typography.size.base, lineHeight: 20, width: 10 },
  hintText:  { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20, flex: 1 },

  footerLink:     { alignItems: 'center', paddingVertical: Spacing.xs },
  footerLinkText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
});
