import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { LearnovaIcon } from '@/components/LearnovaIcon';

const FEATURES = [
  { icon: '▤', label: 'Modules' },
  { icon: '✎', label: 'Notes' },
  { icon: '◆', label: 'Quizzes' },
  { icon: '▶', label: 'Planning' },
  { icon: '✦', label: 'AI Tools' },
];

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fade   = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideY, { toValue: 0, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background glow */}
      <View style={styles.glowCenter} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + Spacing.lg, Spacing['3xl']) },
            { opacity: fade, transform: [{ translateY: slideY }] },
          ]}
        >
          {/* Top spacer */}
          <View style={{ flex: 1 }} />

          {/* Brand block */}
          <View style={styles.brandBlock}>
            <LearnovaIcon size={80} />
            <Text style={styles.headline}>Welcome back.</Text>
            <Text style={styles.subtext}>
              Everything you need for a smarter{'\n'}study life, all in one place.
            </Text>
          </View>

          {/* Feature grid */}
          <View style={styles.featureGrid}>
            {FEATURES.map(({ icon, label }) => (
              <View key={label} style={styles.featureItem}>
                <View style={styles.featureIconWrap}>
                  <Text style={styles.featureIcon}>{icon}</Text>
                </View>
                <Text style={styles.featureLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* CTA buttons */}
          <View style={styles.ctas}>
            <Pressable
              style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
              onPress={() => router.push('/login')}
              accessibilityRole="button"
              accessibilityLabel="Log in to your account"
            >
              <Text style={styles.loginBtnText}>Log In</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}
              onPress={() => router.push('/register')}
              accessibilityRole="button"
              accessibilityLabel="Create a new account"
            >
              <Text style={styles.registerBtnText}>Create Account</Text>
            </Pressable>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing you agree to Learnova's Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  glowCenter: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.accent + '14', // Purple glow
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    gap: Spacing['2xl'],
  },

  brandBlock: { alignItems: 'center', gap: Spacing.md },
  headline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subtext: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 26,
  },

  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  featureItem: { alignItems: 'center', gap: 5 },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon:  { fontSize: 20, color: Colors.primaryLight },
  featureLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  ctas: { gap: Spacing.md },
  loginBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow,
  },
  loginBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.black },

  registerBtn: {
    height: 52,
    backgroundColor: Colors.accentSubtle, // Subtle purple background
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.accentMuted, // Purple border
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    color: Colors.accent, // Purple text
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.975 }] },

  terms: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xl,
  },
});
