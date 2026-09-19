import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'learnova.onboarding_done';

const SLIDES = [
  {
    key: '1',
    icon: '▤',
    title: 'Organize everything\nyou learn',
    body: 'Create subjects, take notes, and keep all your study materials in one focused space.',
    accent: '#5B5FE8',
    features: ['Subjects & Notes', 'Study Materials', 'File Storage'],
  },
  {
    key: '2',
    icon: '▶',
    title: 'Plan your\nstudy time',
    body: 'Build sessions and goals around your schedule. Stay consistent and hit your targets.',
    accent: '#7C3AED',
    features: ['Study Sessions', 'Goal Tracking', 'Calendar View'],
  },
  {
    key: '3',
    icon: '✦',
    title: 'Study smarter\nwith AI',
    body: 'Get instant explanations, AI-generated quizzes, and personalized study plans.',
    accent: '#0D9488',
    features: ['AI Assistant', 'Smart Quizzes', 'Study Plans'],
  },
] as const;

async function markOnboardingDone() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(ONBOARDING_KEY, 'true');
    return;
  }
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.warn('Unable to persist onboarding completion.', error);
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const goToSlide = (index: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 140, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      setCurrent(index);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    });
  };

  const next = () => {
    if (current < SLIDES.length - 1) goToSlide(current + 1);
    else finish();
  };

  const finish = async () => {
    await markOnboardingDone();
    router.replace('/auth');
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Animated background glow */}
      <View
        style={[styles.bgGlow, { backgroundColor: slide.accent + '14' }]}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top row: progress + skip */}
        <View style={styles.topRow}>
          <View style={styles.progressBar}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < current && styles.progressSegmentDone,
                  i === current && [styles.progressSegmentActive, { backgroundColor: slide.accent }],
                ]}
              />
            ))}
          </View>
          {!isLast && (
            <Pressable
              onPress={finish}
              hitSlop={12}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>

        {/* Main slide content */}
        <Animated.View
          style={[
            styles.slideContent,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon illustration */}
          <View style={styles.illustrationWrap}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: slide.accent + '1A', borderColor: slide.accent + '35' },
              ]}
            >
              <Text style={[styles.icon, { color: slide.accent }]}>{slide.icon}</Text>
            </View>
            {/* Decorative rings */}
            <View style={[styles.ring1, { borderColor: slide.accent + '18' }]} />
            <View style={[styles.ring2, { borderColor: slide.accent + '0C' }]} />
          </View>

          {/* Text block */}
          <View style={styles.textBlock}>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideBody}>{slide.body}</Text>
          </View>

          {/* Feature chips */}
          <View style={styles.featureRow}>
            {slide.features.map((f) => (
              <View
                key={f}
                style={[styles.featureChip, { backgroundColor: slide.accent + '16', borderColor: slide.accent + '30' }]}
              >
                <Text style={[styles.featureText, { color: slide.accent }]}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Bottom controls */}
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing['2xl']) }]}>
          {/* Dot indicators */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => goToSlide(i)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${i + 1}`}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    i === current && [styles.dotActive, { backgroundColor: slide.accent }],
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* Next / Get Started */}
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: slide.accent },
              pressed && styles.pressed,
            ]}
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get started' : 'Next'}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Continue'}</Text>
            {!isLast && <Text style={styles.nextArrow}>→</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },

  // Top bar
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  progressBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    height: 3,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressSegmentDone:   { backgroundColor: Colors.textMuted },
  progressSegmentActive: { height: 3 },
  skipBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },

  // Slide
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing['2xl'],
  },

  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon:  { fontSize: 50 },
  ring1: { position: 'absolute', width: 168, height: 168, borderRadius: 84, borderWidth: 1 },
  ring2: { position: 'absolute', width: 206, height: 206, borderRadius: 103, borderWidth: 1 },

  textBlock: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.sm },
  slideTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    textAlign: 'center',
    letterSpacing: Typography.tracking.tight,
    lineHeight: 36,
  },
  slideBody: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 26,
  },

  featureRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  featureChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  featureText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  // Bottom
  bottom: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: { width: 22, borderRadius: 4 },

  nextBtn: {
    height: 56,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  nextBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.black },
  nextArrow:   { color: Colors.white, fontSize: Typography.size.lg, marginTop: 1 },
  pressed:     { opacity: 0.78, transform: [{ scale: 0.976 }] },
});
