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
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LearnovaIcon } from '@/components/LearnovaIcon';

const { width, height } = Dimensions.get('window');

// Preview cards that float in the upper half
const PREVIEW_CARDS = [
  { label: 'Data Structures', sub: '68% complete', color: Colors.subjectColors[0], x: -8, y: 10, rot: '-6deg' },
  { label: 'Linear Algebra', sub: 'Note · 1h ago', color: Colors.subjectColors[1], x: width - 172, y: 70, rot: '5deg' },
  { label: 'Quiz · 9/10', sub: '90% score', color: Colors.subjectColors[3], x: 16, y: 130, rot: '4deg' },
  { label: 'Study Session', sub: 'Tomorrow 10 AM', color: Colors.subjectColors[4], x: width - 180, y: 190, rot: '-5deg' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(36)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const [cardAnims] = useState(() => PREVIEW_CARDS.map(() => new Animated.Value(0)));

  useEffect(() => {
    // Main entrance animations
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideUp, { toValue: 0, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(logoScale, { 
        toValue: 1, 
        friction: 5, 
        tension: 40, 
        useNativeDriver: Platform.OS !== 'web' 
      }),
    ]).start();

    // Staggered card animations
    PREVIEW_CARDS.forEach((_, i) => {
      Animated.spring(cardAnims[i], {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: 200 + i * 120,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });

    // Continuous float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { 
          toValue: -7, 
          duration: 2200, 
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.timing(floatY, { 
          toValue: 0, 
          duration: 2200, 
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web' 
        }),
      ])
    ).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.15,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Radial glow */}
      <Animated.View 
        style={[
          styles.glowA, 
          { transform: [{ scale: glowPulse }] }
        ]} 
        pointerEvents="none" 
      />
      <Animated.View 
        style={[
          styles.glowB, 
          { transform: [{ scale: glowPulse }] }
        ]} 
        pointerEvents="none" 
      />

      {/* Floating preview cards */}
      <View style={styles.floatingArea} pointerEvents="none">
        {PREVIEW_CARDS.map((card, i) => (
          <Animated.View
            key={i}
            style={[
              styles.floatCard,
              {
                left: card.x,
                top: card.y,
                opacity: cardAnims[i],
                transform: [
                  { translateY: floatY },
                  { rotate: card.rot },
                  {
                    scale: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.88, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.floatDot, { backgroundColor: card.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.floatLabel} numberOfLines={1}>{card.label}</Text>
              <Text style={styles.floatSub}>{card.sub}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <Animated.View
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + Spacing.xl, Spacing['3xl']) },
            { opacity: fade, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Logo */}
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <LearnovaIcon size={80} />
          </Animated.View>

          {/* Hero text */}
          <View style={styles.heroBlock}>
            <Text style={styles.headline}>Your study life,{'\n'}organized.</Text>
            <Text style={styles.subtext}>
              Learn smarter. Plan better.{'\n'}Make real progress — every day.
            </Text>
          </View>

          {/* CTAs */}
          <View style={styles.ctaGroup}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => router.push('/onboarding')}
              accessibilityRole="button"
              accessibilityLabel="Get started"
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <View style={styles.arrowPill}>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={() => router.push('/auth')}
              accessibilityRole="button"
              accessibilityLabel="I already have an account"
            >
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </Pressable>
          </View>

          {/* Tagline */}
          <View style={styles.taglineRow}>
            {['Learn', 'Plan', 'Practice', 'Progress'].map((w, i) => (
              <View key={w} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                {i > 0 && <View style={styles.taglineDot} />}
                <Text style={styles.taglineWord}>{w}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  glowA: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary + '20', // Enhanced glow opacity
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
  },
  glowB: {
    position: 'absolute',
    top: 80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.accent + '18', // Enhanced glow opacity
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
  },

  floatingArea: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 320,
  },
  floatCard: {
    position: 'absolute',
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: 164,
    ...Shadow.sm,
  },
  floatDot:   { width: 9, height: 9, borderRadius: 4.5, flexShrink: 0 },
  floatLabel: { color: Colors.textPrimary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  floatSub:   { color: Colors.textMuted, fontSize: 10, marginTop: 1 },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.xl,
    gap: Spacing['2xl'],
    paddingTop: height * 0.42,
  },

  logoGroup: { gap: 4 },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoN:    { color: Colors.white, fontSize: 22, fontWeight: Typography.weight.black },
  logoText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
    letterSpacing: 1.5,
  },

  heroBlock: { gap: Spacing.md },
  headline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    lineHeight: 40,
  },
  subtext: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    lineHeight: 26,
  },

  ctaGroup: { gap: Spacing.md },
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.glow,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    flex: 1,
    color: Colors.white,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.black,
  },
  arrowPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: { color: Colors.white, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  secondaryBtn: {
    height: 52,
    backgroundColor: Colors.accentSubtle, // Subtle purple background
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.accentMuted, // Purple border
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.accent, // Purple text
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.974 }] },

  taglineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  taglineDot:  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted + '60' },
  taglineWord: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium, letterSpacing: 0.4 },
});
