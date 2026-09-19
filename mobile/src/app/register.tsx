import React, { useEffect, useRef, useState } from 'react';
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
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { registerUser } from '@/services/api/userApi';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { LearnovaIcon } from '@/components/LearnovaIcon';

const { width } = Dimensions.get('window');

// ─── Schemas ──────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  full_name:       z.string().min(2, 'Name must be at least 2 characters.'),
  email:           z.string().email('Enter a valid email address.'),
  password:        z.string().min(8, 'Password must be at least 8 characters.'),
  university:      z.string().optional(),
  degree:          z.string().optional(),
  graduation_year: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 2020 && Number(val) <= 2040),
    { message: 'Graduation year must be 2020–2040.' }
  ),
});
export type RegisterFormData = z.infer<typeof registerSchema>;

const zodResolver = (schema: z.ZodType<any>) => async (values: any) => {
  const result = schema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, any> = {};
  result.error.issues.forEach((issue) => {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = { type: issue.code, message: issue.message };
  });
  return { values: {}, errors };
};

// ─── Enhanced input with floating label ────────────────────────────────────────
function InputField({
  value, onChange, placeholder, keyboardType, autoCapitalize,
  error, returnKeyType, onSubmit, secureEntry,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: any; autoCapitalize?: any; error?: string;
  returnKeyType?: any; onSubmit?: () => void; secureEntry?: boolean;
}) {
  const [show, setShow]       = useState(!secureEntry);
  const [focused, setFocused] = useState(false);

  return (
    <View style={inf.outer}>
      <View style={[
        inf.wrap,
        focused && inf.focused,
        !!error && inf.errored,
      ]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          secureTextEntry={!show}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inf.input}
        />
        {secureEntry && (
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={inf.eyeBtn}>
            <Text style={inf.eyeIcon}>{show ? '◉' : '○'}</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={inf.errorRow}>
          <Text style={inf.errorDot}>●</Text>
          <Text style={inf.errorMsg}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const inf = StyleSheet.create({
  outer: { gap: 5 },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
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
  errored: { borderColor: Colors.error + '80' },
  input:   { 
    flex: 1, 
    color: Colors.textPrimary, 
    fontSize: Typography.size.base, 
    paddingHorizontal: Spacing.base,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  eyeBtn:  { width: 46, height: '100%', alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { color: Colors.textMuted, fontSize: 15 },
  errorRow:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  errorDot:{ color: Colors.error, fontSize: 6, lineHeight: 16 },
  errorMsg:{ color: Colors.errorLight, fontSize: Typography.size.xs, lineHeight: 16, flex: 1 },
});

// ─── Horizontal step tracker with progress animation ──────────────────────────
const STEPS = [
  { id: 0, label: 'You',      icon: '●' },
  { id: 1, label: 'Study',    icon: '▤' },
  { id: 2, label: 'Security', icon: '★' },
] as const;

function StepTrack({ current }: { current: number }) {
  const lineProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(lineProgress, {
      toValue: current,
      friction: 7,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [current]);

  return (
    <View style={st.container}>
      {/* Animated progress line */}
      <View style={st.lineTrack}>
        <Animated.View 
          style={[
            st.lineProgress,
            {
              width: lineProgress.interpolate({
                inputRange: [0, 1, 2],
                outputRange: ['0%', '50%', '100%'],
              }),
            },
          ]} 
        />
      </View>

      <View style={st.row}>
        {STEPS.map((step, i) => {
          const done   = i < current;
          const active = i === current;
          return (
            <View key={step.id} style={st.item}>
              <Animated.View
                style={[
                  st.circle,
                  done   && st.done,
                  active && st.active,
                ]}
              >
                {done
                  ? <Text style={st.check}>✓</Text>
                  : <Text style={[st.num, active && st.numActive]}>{i + 1}</Text>
                }
              </Animated.View>
              <Text style={[st.lbl, (active || done) && st.lblActive]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { position: 'relative' },
  lineTrack: {
    position: 'absolute',
    top: 15,
    left: '16.66%',
    right: '16.66%',
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  lineProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  row:  { flexDirection: 'row', alignItems: 'flex-start', position: 'relative', zIndex: 1 },
  item: { flex: 1, alignItems: 'center', gap: 5 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  active: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  done: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  num:       { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  numActive: { color: Colors.primaryLight },
  check:     { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
  lbl:       { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.weight.medium, textAlign: 'center', marginTop: 2 },
  lblActive: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep]               = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  // Slide animation per step
  const slideX = useRef(new Animated.Value(0)).current;
  const alpha  = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const meshPulse = useRef(new Animated.Value(1)).current;

  // Mesh pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(meshPulse, {
          toValue: 1.12,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(meshPulse, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
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

  const animateIn = (dir: 1 | -1, cb: () => void) => {
    Animated.sequence([
      Animated.timing(alpha, { 
        toValue: 0, 
        duration: 150, 
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web' 
      }),
      Animated.timing(slideX, {
        toValue: 0,
        duration: 0,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      slideX.setValue(dir * 30);
      cb();
      Animated.parallel([
        Animated.spring(alpha, { 
          toValue: 1, 
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.spring(slideX, { 
          toValue: 0, 
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web' 
        }),
      ]).start();
    });
  };

  // Entry animation
  const entryFade = useRef(new Animated.Value(0)).current;
  const entryRise = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryFade, { 
        toValue: 1, 
        duration: 500, 
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web' 
      }),
      Animated.spring(entryRise, { 
        toValue: 0, 
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web' 
      }),
    ]).start();
    alpha.setValue(1);
  }, []);

  const { control, handleSubmit, formState: { errors }, trigger } = useForm<RegisterFormData>({
    defaultValues: { full_name: '', email: '', password: '', university: '', degree: '', graduation_year: '' },
    resolver: zodResolver(registerSchema),
  });

  const goNext = async () => {
    const map: (keyof RegisterFormData)[][] = [
      ['full_name', 'email'],
      ['university', 'degree', 'graduation_year'],
      ['password'],
    ];
    const valid = await trigger(map[step]);
    if (valid) animateIn(1, () => setStep((s) => s + 1));
  };

  const goBack = () => {
    if (step > 0) animateIn(-1, () => setStep((s) => s - 1));
    else router.back();
  };

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await registerUser({
        full_name:       data.full_name,
        email:           data.email,
        password:        data.password,
        university:      data.university || undefined,
        degree:          data.degree || undefined,
        graduation_year: data.graduation_year ? Number(data.graduation_year) : undefined,
      });
      setSuccessMsg(`Welcome, ${res.full_name}! Check your email.`);
      setTimeout(() => router.replace({ pathname: '/verify-email', params: { email: data.email } } as any), 900);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409)      setServerError('This email already has an account.');
        else if (err.response?.status === 422) setServerError('Check your details and try again.');
        else if (err.request)                  setServerError('Cannot connect. Check your network.');
        else                                   setServerError('Something went wrong. Try again.');
      } else {
        setServerError('An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step titles and subtitles
  const stepMeta = [
    { title: 'Who are you?',     sub: 'We\'ll personalise your experience.' },
    { title: 'Your studies',     sub: 'Helps us tailor AI suggestions. Skip anytime.' },
    { title: 'Secure it',        sub: 'Choose a strong password to protect your account.' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background mesh */}
      <Animated.View 
        style={[
          s.meshA,
          { transform: [{ scale: meshPulse }] }
        ]} 
        pointerEvents="none" 
      />
      <Animated.View 
        style={[
          s.meshB,
          { transform: [{ scale: meshPulse }] }
        ]} 
        pointerEvents="none" 
      />

      {/* Top safe area — back button */}
      <SafeAreaView style={s.safeTop} edges={['top']}>
        <Pressable
          onPress={goBack}
          hitSlop={14}
          style={s.backPill}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={s.backChevron}>←</Text>
          <Text style={s.backText}>{step > 0 ? 'Back' : 'Back'}</Text>
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
          <Animated.View style={[s.body, { opacity: entryFade, transform: [{ translateY: entryRise }] }]}>

            {/* ── Header ── */}
            <View style={s.header}>
              <LearnovaIcon size={80} />
              <Text style={s.headline}>Create account</Text>
              <Text style={s.sub}>Start learning smarter today. Free forever.</Text>
            </View>

            {/* ── Step tracker ── */}
            <StepTrack current={step} />

            {/* ── Step heading ── */}
            <View style={s.stepHeading}>
              <Text style={s.stepTitle}>{stepMeta[step].title}</Text>
              <Text style={s.stepSub}>{stepMeta[step].sub}</Text>
            </View>

            {/* ── Form fields (animated) ── */}
            <Animated.View style={[s.fields, { opacity: alpha, transform: [{ translateX: slideX }] }]}>

              {/* Server / success messages */}
              {serverError && (
                <View style={s.errorBox}>
                  <Text style={s.errorDot}>●</Text>
                  <Text style={s.errorText}>{serverError}</Text>
                  <Pressable onPress={() => setServerError(null)} hitSlop={8}>
                    <Text style={s.errorClose}>✕</Text>
                  </Pressable>
                </View>
              )}
              {successMsg && (
                <View style={s.successBox}>
                  <Text style={s.successIcon}>✓</Text>
                  <Text style={s.successText}>{successMsg}</Text>
                </View>
              )}

              {/* Step 0 — Personal */}
              {step === 0 && (
                <>
                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Full name <Text style={s.req}>*</Text></Text>
                    <Controller
                      control={control}
                      name="full_name"
                      render={({ field: { onChange, value } }) => (
                        <InputField
                          value={value}
                          onChange={onChange}
                          placeholder="e.g. Alex Johnson"
                          autoCapitalize="words"
                          error={errors.full_name?.message}
                          returnKeyType="next"
                        />
                      )}
                    />
                  </View>
                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Email address <Text style={s.req}>*</Text></Text>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <InputField
                          value={value}
                          onChange={onChange}
                          placeholder="you@university.edu"
                          keyboardType="email-address"
                          error={errors.email?.message}
                          returnKeyType="done"
                        />
                      )}
                    />
                  </View>
                </>
              )}

              {/* Step 1 — Academic */}
              {step === 1 && (
                <>
                  <View style={s.fieldWrap}>
                    <Text style={s.label}>University</Text>
                    <Controller
                      control={control}
                      name="university"
                      render={({ field: { onChange, value } }) => (
                        <InputField
                          value={value ?? ''}
                          onChange={onChange}
                          placeholder="e.g. MIT"
                          returnKeyType="next"
                        />
                      )}
                    />
                  </View>
                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Degree / Program</Text>
                    <Controller
                      control={control}
                      name="degree"
                      render={({ field: { onChange, value } }) => (
                        <InputField
                          value={value ?? ''}
                          onChange={onChange}
                          placeholder="e.g. B.S. Computer Science"
                          returnKeyType="next"
                        />
                      )}
                    />
                  </View>
                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Graduation year</Text>
                    <Controller
                      control={control}
                      name="graduation_year"
                      render={({ field: { onChange, value } }) => (
                        <InputField
                          value={value ?? ''}
                          onChange={onChange}
                          placeholder="e.g. 2027"
                          keyboardType="numeric"
                          error={errors.graduation_year?.message}
                          returnKeyType="done"
                        />
                      )}
                    />
                  </View>
                </>
              )}

              {/* Step 2 — Password */}
              {step === 2 && (
                <>
                  {/* Password strength hint */}
                  <View style={s.pwHints}>
                    {['8+ characters', 'Mix letters & numbers', 'Avoid personal info'].map((hint) => (
                      <View key={hint} style={s.pwHintRow}>
                        <View style={s.pwHintDot} />
                        <Text style={s.pwHintText}>{hint}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <InputField
                          value={value}
                          onChange={onChange}
                          placeholder="At least 8 characters"
                          secureEntry
                          error={errors.password?.message}
                          returnKeyType="done"
                        />
                      )}
                    />
                  </View>
                </>
              )}
            </Animated.View>

            {/* ── CTA ── */}
            <View style={s.ctas}>
              {step < 2 ? (
                <Pressable
                  onPress={goNext}
                  style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
                  accessibilityRole="button"
                >
                  <Text style={s.primaryBtnText}>Continue</Text>
                  <Text style={s.primaryBtnArrow}>→</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSubmit(onSubmit)}
                  disabled={submitting}
                  style={({ pressed }) => [
                    s.primaryBtn,
                    submitting && { opacity: 0.7 },
                    pressed && s.primaryBtnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  {submitting ? (
                    <>
                      <Animated.View 
                        style={[
                          s.spinner,
                          { transform: [{ rotate: spin }] }
                        ]} 
                      />
                      <Text style={s.primaryBtnText}>Creating account…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.primaryBtnText}>Create Account</Text>
                      <Text style={s.primaryBtnArrow}>✓</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {/* ── Progress bar ── */}
            <View style={s.progressBar}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.progressSeg,
                    i <= step && s.progressSegActive,
                  ]}
                />
              ))}
            </View>

            {/* ── Footer ── */}
            <View style={s.footer}>
              <Text style={s.footerMuted}>Already have an account?</Text>
              <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                <Text style={s.footerLink}> Sign in →</Text>
              </Pressable>
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

  // Background
  meshA: {
    position: 'absolute', top: -100, left: -80,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: Colors.primary + '1C',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
  },
  meshB: {
    position: 'absolute', top: 140, right: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: Colors.primaryLight + '0C',
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },

  // Back
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
  body:   { gap: Spacing.xl },

  // Header
  header: { gap: Spacing.sm, paddingTop: Spacing.lg },
  logoWrap: {
    width: 64, height: 64,
    position: 'relative', alignSelf: 'flex-start',
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
    fontSize: Typography.size.sm, fontWeight: Typography.weight.bold,
    letterSpacing: 3, textTransform: 'uppercase',
  },
  headline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['5xl'], fontWeight: Typography.weight.black,
    letterSpacing: -1.5, lineHeight: 42, marginTop: 2,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: Typography.size.base, lineHeight: 24, marginTop: Spacing.xs,
  },

  // Step heading
  stepHeading: { gap: 4 },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  stepSub: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20 },

  // Fields
  fields:   { gap: Spacing.lg },
  fieldWrap:{ gap: 6 },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, letterSpacing: 0.2,
  },
  req: { color: Colors.error },

  // Error / success banners
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
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.successMuted,
    borderWidth: 1, borderColor: Colors.success + '50',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  successIcon: { color: Colors.successLight, fontSize: 14, fontWeight: Typography.weight.black },
  successText: { flex: 1, color: Colors.successLight, fontSize: Typography.size.sm, lineHeight: 19 },

  // Password hints
  pwHints: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primaryMuted,
    padding: Spacing.md, gap: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pwHintRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pwHintDot:  { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: Colors.primaryLight, 
    flexShrink: 0,
  },
  pwHintText: { 
    color: Colors.primary, 
    fontSize: Typography.size.xs, 
    lineHeight: 20,
    fontWeight: Typography.weight.medium,
  },

  // CTA
  ctas: {},
  primaryBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: Radius.lg, 
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnPressed: { opacity: 0.85, transform: [{ scale: 0.982 }] },
  primaryBtnText:    { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.black, letterSpacing: 0.2 },
  primaryBtnArrow:   { color: Colors.white, fontSize: Typography.size.lg },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: Colors.white,
  },

  // Progress segments
  progressBar: { flexDirection: 'row', gap: Spacing.sm },
  progressSeg: {
    flex: 1, height: 3, borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  progressSegActive: { backgroundColor: Colors.primary },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xs },
  footerMuted: { color: Colors.textMuted, fontSize: Typography.size.sm },
  footerLink:  { color: Colors.accent, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold }, // Purple accent
});
