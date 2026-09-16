import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resendVerification, verifyEmail } from '@/services/api/userApi';
import { Button, Field, Message } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token, email: emailParam } = useLocalSearchParams<{ token?: string; email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then((response) => setMessage(response.message))
      .catch((err: unknown) => {
        setError(axios.isAxiosError(err) && err.response?.status === 400
          ? 'This verification link is invalid or expired.'
          : 'Unable to verify your email. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const resend = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError(null);
    try {
      const response = await resendVerification(email.trim());
      setMessage(response.message);
    } catch {
      setError('Unable to resend verification instructions. Please try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  Back</Text></Pressable>
          <View style={styles.header}><Text style={styles.title}>{loading ? 'Verifying email…' : 'Verify your email'}</Text><Text style={styles.subtitle}>Confirm your email to keep your Nexora account secure.</Text></View>
          <View style={styles.card}>
            {error && <Message tone="error">{error}</Message>}
            {message && <Message tone="success">{message}</Message>}
            <Field label="Email address" placeholder="student@university.edu" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Button label="Resend verification email" onPress={resend} size="lg" />
          </View>
          <Pressable onPress={() => router.replace('/login')}><Text style={styles.link}>Back to sign in</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: Spacing.xl, gap: Spacing['2xl'] },
  back: { alignSelf: 'flex-start' },
  backText: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  header: { gap: Spacing.md, paddingTop: Spacing.lg },
  title: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black },
  subtitle: { color: Colors.textMuted, fontSize: Typography.size.base, lineHeight: 22 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, gap: Spacing.lg },
  link: { color: Colors.primaryLight, textAlign: 'center', fontWeight: Typography.weight.bold },
});
