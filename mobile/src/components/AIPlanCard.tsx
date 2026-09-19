// ─── AIPlanCard ───────────────────────────────────────────────────────────────
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';
import { StudyPlanContent } from '@/components/StudyPlanContent';

interface AIPlanCardProps {
  plan: string | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function AIPlanCard({ plan, loading, error, onDismiss, onRetry }: AIPlanCardProps) {
  if (!loading && !error && !plan) return null;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.badge}>
          <Text style={s.badgeIcon}>✦</Text>
          <Text style={s.badgeText}>{loading ? 'Building plan…' : 'Your AI Study Plan'}</Text>
        </View>
        {onDismiss && !loading && (
          <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss plan" style={s.dismissBtn}>
            <Text style={s.dismissText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Text style={s.disclaimerIcon}>◈</Text>
        <Text style={s.disclaimerText}>
          {loading ? 'Creating a plan around your goals and schedule…' : 'Saved automatically to your study plans.'}
        </Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={s.skeletons}>
          <SkeletonLine width="38%" height={14} />
          <SkeletonLine width="96%" height={12} />
          <SkeletonLine width="88%" height={12} />
          <SkeletonLine width="32%" height={14} style={{ marginTop: Spacing.sm }} />
          <SkeletonLine width="92%" height={12} />
          <SkeletonLine width="78%" height={12} />
          <SkeletonLine width="55%" height={12} />
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={s.errorWrap}>
          {error === 'rate_limit' ? <AIRateLimitBanner /> : <Message tone="error">{AI_ERROR_MESSAGES[error]}</Message>}
          {onRetry && error !== 'rate_limit' && <Button label="Try again" onPress={onRetry} variant="ghost" size="sm" />}
        </View>
      )}

      {/* Success */}
      {!loading && !error && plan && (
        <ScrollView style={s.planScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <StudyPlanContent plan={plan} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primary + '35',
    padding: Spacing.lg, gap: Spacing.md, ...Shadow.sm,
  },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primarySubtle, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primaryMuted,
  },
  badgeIcon: { color: Colors.primaryLight, fontSize: 11 },
  badgeText: {
    color: Colors.primaryLight, fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  dismissBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dismissText: { color: Colors.textMuted, fontSize: 10, fontWeight: Typography.weight.bold },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.warningMuted, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.warning + '40',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  disclaimerIcon: { color: Colors.warningLight, fontSize: 13, flexShrink: 0 },
  disclaimerText: { color: Colors.warningLight, fontSize: Typography.size.xs, lineHeight: 18, flex: 1 },
  skeletons:  { gap: Spacing.sm },
  errorWrap:  { gap: Spacing.sm },
  planScroll: { maxHeight: 420 },
});
