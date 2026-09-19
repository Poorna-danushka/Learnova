import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginUser } from '@/services/api/userApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { LearnovaIcon } from '@/components/LearnovaIcon';

const { width, height } = Dimensions.get('window');

// ─── Floating label text input ────────────────────────────────────────────────
function FloatingLabelField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  error,
  returnKeyType,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  error?: boolean;
  returnKeyType?: any;
  onSubmit?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: focused || value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -8],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Typography.size.base, 11],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textMuted, focused ? Colors.primary : Colors.textSecondary],
  });

  return (
    <View style={flf.container}>
      <Animated.Text
        style={[
          flf.floatingLabel,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: labelColor,
          },
        ]}
      >
        {label}
      </Animated.Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={focused ? placeholder : ''}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          flf.input,
          focused && flf.focused,
          error && flf.error,
        ]}
      />
    </View>
  );
}

const flf = StyleSheet.create({
  container: {
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: Spacing.base,
    backgroundColor: Colors.bg,
    paddingHorizontal: 4,
    zIndex: 1,
    fontWeight: Typography.weight.semibold,
  },
  input: {
    height: 52,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    paddingHorizontal: Spacing.base,
    paddingTop: 4,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  focused: { 
    borderColor: Colors.primary, 
    backgroundColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  error: { borderColor: Colors.error },
});

// ─── Floating label password field ────────────────────────────────────────────
function FloatingPasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: focused || value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -8],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Typography.size.base, 11],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textMuted, focused ? Colors.primary : Colors.textSecondary],
  });

  return (
    <View style={fpf.container}>
      <Animated.Text
        style={[
          fpf.floatingLabel,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: labelColor,
          },
        ]}
      >
        {label}
      </Animated.Text>
      <View
        style={[
          fpf.wrap,
          focused && fpf.focused,
          error && fpf.error,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          placeholder={focused ? placeholder : ''}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={fpf.input}
        />
        <Pressable
          onPress={() => setShow((v) => !v)}
          hitSlop={10}
          style={fpf.eyeBtn}
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
        >
          <Text style={fpf.eyeIcon}>{show ? '◉' : '○'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const fpf = StyleSheet.create({
  container: {
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: Spacing.base,
    backgroundColor: Colors.bg,
    paddingHorizontal: 4,
    zIndex: 1,
    fontWeight: Typography.weight.semibold,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: 52,
    paddingLeft: Spacing.base,
  },
  focused: { 
    borderColor: Colors.primary, 
    backgroundColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  error: { borderColor: Colors.error },
  input: { 
    flex: 1, 
    color: Colors.textPrimary, 
    fontSize: Typography.size.base,
    paddingTop: 4,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  eyeBtn: { width: 46, height: '100%', alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { color: Colors.textMuted, fontSize: 15 },
});

// ─── Old inline password field (keeping for compatibility) ────────────────────
function PwField({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        pw.wrap,
        focused && pw.focused,
        error && pw.error,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={pw.input}
      />
      <Pressable
        onPress={() => setShow((v) => !v)}
        hitSlop={10}
        style={pw.eyeBtn}
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
      >
        <Text style={pw.eyeIcon}>{show ? '◎' : '○'}</Text>
      </Pressable>
    </View>
  );
}

const pw = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: 52,
    paddingLeft: Spacing.base,
  },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  error:   { borderColor: Colors.error },
  input:   { 
    flex: 1, 
    color: Colors.textPrimary, 
    fontSize: Typography.size.base,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  eyeBtn:  { width: 46, height: '100%', alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { color: Colors.textMuted, fontSize: 15 },
});

// ─── Inline text input ────────────────────────────────────────────────────────
function TxtField({
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  error,
  returnKeyType,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  error?: boolean;
  returnKeyType?: any;
  onSubmit?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'none'}
      autoCorrect={false}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmit}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        tf.input,
        focused && tf.focused,
        error && tf.error,
      ]}
    />
  );
}

const tf = StyleSheet.create({
  input: {
    height: 52,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    paddingHorizontal: Spacing.base,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  error:   { borderColor: Colors.error },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router     = useRouter();
  const { signIn } = useAuth();
  const insets     = useSafeAreaInsets();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(24)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(riseAnim, { toValue: 0, duration: 480, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  useEffect(() => {
    if (submitting) {
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
  }, [submitting]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const submit = async () => {
    if (!email.trim()) { setErrorMsg('Email is required.'); return; }
    if (!password)     { setErrorMsg('Password is required.'); return; }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await loginUser({ email: email.trim(), password });
      await signIn(res.access_token, res.refresh_token);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401)      setErrorMsg('Incorrect email or password.');
        else if (err.response?.status === 422) setErrorMsg('Enter a valid email address.');
        else if (err.request)                  setErrorMsg('Cannot connect. Check your network.');
        else                                   setErrorMsg('Something went wrong. Try again.');
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Mesh gradient background ── */}
      <View style={s.meshA} pointerEvents="none" />
      <View style={s.meshB} pointerEvents="none" />
      <View style={s.meshC} pointerEvents="none" />

      {/* Subtle grid lines */}
      <View style={s.gridOverlay} pointerEvents="none" />

      <SafeAreaView style={s.safeTop} edges={['top']}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={14}
          style={s.backPill}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={s.backChevron}>←</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: insets.bottom + Spacing['3xl'] },
          ]}
        >
          <Animated.View
            style={[s.body, { opacity: fadeAnim, transform: [{ translateY: riseAnim }] }]}
          >
            {/* ── Header ── */}
            <View style={s.header}>
              {/* Logo mark */}
              <LearnovaIcon size={80} />
              <Text style={s.headline}>Sign in</Text>
              <Text style={s.sub}>
                Good to see you again.{'\n'}Let's pick up where you left off.
              </Text>
            </View>

            {/* ── Form ── */}
            <View style={s.form}>
              {/* Error */}
              {errorMsg && (
                <View style={s.errorBox}>
                  <Text style={s.errorDot}>●</Text>
                  <Text style={s.errorText}>{errorMsg}</Text>
                  <Pressable onPress={() => setErrorMsg(null)} hitSlop={8}>
                    <Text style={s.errorClose}>✕</Text>
                  </Pressable>
                </View>
              )}

              {/* Email */}
              <FloatingLabelField
                label="Email address"
                value={email}
                onChange={setEmail}
                placeholder="you@university.edu"
                keyboardType="email-address"
                returnKeyType="next"
                error={errorMsg !== null && !email.trim()}
              />

              {/* Password */}
              <View style={s.passwordGroup}>
                <FloatingPasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Your password"
                  error={errorMsg !== null && !password}
                />
                <Pressable 
                  onPress={() => router.push('/forgot-password' as any)} 
                  hitSlop={8}
                  style={s.forgotLinkBtn}
                >
                  <Text style={s.forgotLink}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Submit */}
              <Pressable
                onPress={submit}
                disabled={submitting}
                style={({ pressed }) => [
                  s.submitBtn,
                  submitting && s.submitBtnBusy,
                  pressed && s.submitBtnPressed,
                ]}
                accessibilityRole="button"
              >
                {submitting ? (
                  <View style={s.submitInner}>
                    <Animated.View 
                      style={[
                        s.spinner,
                        { transform: [{ rotate: spin }] }
                      ]} 
                    />
                    <Text style={s.submitText}>Signing in…</Text>
                  </View>
                ) : (
                  <View style={s.submitInner}>
                    <Text style={s.submitText}>Sign In</Text>
                    <Text style={s.submitArrow}>→</Text>
                  </View>
                )}
              </Pressable>

              {/* Divider */}
              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>or</Text>
                <View style={s.dividerLine} />
              </View>

              {/* Create account */}
              <Pressable
                onPress={() => router.push('/register' as any)}
                style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <Text style={s.secondaryBtnText}>Create a free account</Text>
              </Pressable>
            </View>

            {/* ── Footer ── */}
            <View style={s.footer}>
              <View style={s.footerDot} />
              <Text style={s.footerText}>Learn · Plan · Practice · Progress</Text>
              <View style={s.footerDot} />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  kav:  { flex: 1 },

  // Mesh background
  meshA: {
    position: 'absolute', top: -120, left: -100,
    width: 380, height: 380, borderRadius: 190,
    backgroundColor: Colors.primary + '20',
  },
  meshB: {
    position: 'absolute', top: 120, right: -120,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.primaryLight + '0E',
  },
  meshC: {
    position: 'absolute', bottom: -80, left: '20%',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.primary + '08',
  },
  gridOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.04,
    // visual hint only — no actual grid rendered in RN
  },

  // Top safe area + back
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm, marginLeft: Spacing.lg,
    backgroundColor: Colors.surface + 'DD',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    ...Shadow.xs,
  },
  backChevron: { color: Colors.textSecondary, fontSize: Typography.size.base },
  backText:    { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: 90 },
  body:   { gap: Spacing['2xl'] },

  // Header
  header: { gap: Spacing.sm, paddingTop: Spacing.lg },
  logoWrap: {
    width: 64, height: 64,
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  logo: {
    width: 64, height: 64, borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.glow,
  },
  logoPulse: {
    position: 'absolute', top: -4, left: -4,
    width: 72, height: 72, borderRadius: 22,
    borderWidth: 1.5, borderColor: Colors.primary + '35',
  },
  logoLetter: { color: Colors.white, fontSize: 30, fontWeight: Typography.weight.black },

  appName: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['5xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: -1.5,
    lineHeight: 42,
    marginTop: 2,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    lineHeight: 24,
    marginTop: Spacing.xs,
  },

  // Form
  form: { gap: Spacing.lg },
  fieldGroup: { gap: Spacing.xs },
  passwordGroup: { gap: Spacing.xs, position: 'relative' },
  forgotLinkBtn: { alignSelf: 'flex-end', marginTop: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.2,
  },
  forgotLink: {
    color: Colors.accent, // Purple accent
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
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

  // Submit button
  submitBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.glow,
  },
  submitBtnBusy:    { opacity: 0.7 },
  submitBtnPressed: { opacity: 0.85, transform: [{ scale: 0.982 }] },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  submitText: {
    color: Colors.white,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.3,
  },
  submitArrow: { color: Colors.white, fontSize: Typography.size.lg },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: Colors.white,
  },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  // Secondary button
  secondaryBtn: {
    height: 52,
    backgroundColor: Colors.accentSubtle, // Subtle purple tint
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.accentMuted, // Purple border
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.accent, // Purple text
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  footerDot:  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.border },
  footerText: { color: Colors.textMuted, fontSize: Typography.size.xs, letterSpacing: 0.5 },
});
