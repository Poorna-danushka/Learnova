import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '@/services/api/userApi';
import { Button, Field, Message, PasswordField } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token.trim() || password.length < 8) {
      setError('Enter a valid reset token and a password of at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await resetPassword(token.trim(), password);
      setMessage(response.message);
      setTimeout(() => router.replace('/login'), 1000);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) && err.response?.status === 400
        ? 'This reset link is invalid or expired.'
        : 'Unable to reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  Back</Text></Pressable>
          <View style={styles.header}><Text style={styles.title}>Reset password</Text><Text style={styles.subtitle}>Choose a new password for your Nexora account.</Text></View>
          <View style={styles.card}>
            {error && <Message tone="error">{error}</Message>}
            {message && <Message tone="success">{message}</Message>}
            {!params.token && <Field label="Reset token" placeholder="Paste the token from your email" autoCapitalize="none" value={token} onChangeText={setToken} />}
            <PasswordField label="New password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} />
            <PasswordField label="Confirm new password" placeholder="Repeat your new password" value={confirmation} onChangeText={setConfirmation} />
            <Button label={loading ? 'Updating…' : 'Reset password'} onPress={submit} loading={loading} size="lg" />
          </View>
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
});
