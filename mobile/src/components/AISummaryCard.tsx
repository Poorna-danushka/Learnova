// ─── AISummaryCard ────────────────────────────────────────────────────────────
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';

interface AISummaryCardProps {
  summary: string | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function AISummaryCard({ summary, loading, error, onDismiss, onRetry }: AISummaryCardProps) {
  if (!loading && !error && !summary) return null;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.badge}>
          <Text style={s.badgeIcon}>✦</Text>
          <Text style={s.badgeText}>AI Summary</Text>
        </View>
        {onDismiss && !loading && (
          <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss summary" style={s.dismissBtn}>
            <Text style={s.dismissText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Loading */}
      {loading && (
        <View style={s.skeletons}>
          <SkeletonLine width="96%" height={13} />
          <SkeletonLine width="88%" height={13} />
          <SkeletonLine width="92%" height={13} />
          <SkeletonLine width="74%" height={13} />
          <SkeletonLine width="84%" height={13} />
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
      {!loading && !error && summary && (
        <>
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerLabel}>SUMMARY</Text>
            <View style={s.dividerLine} />
          </View>
          <Text style={s.summaryText}>{summary}</Text>
          <View style={s.footer}>
            <View style={s.footerBadge}>
              <Text style={s.footerBadgeText}>✦ AI-generated</Text>
            </View>
            <Text style={s.footerNote}>Not saved to your notes</Text>
          </View>
        </>
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
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  skeletons:  { gap: Spacing.sm },
  errorWrap:  { gap: Spacing.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine:{ flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel:{ color: Colors.textMuted, fontSize: 10, fontWeight: Typography.weight.bold, letterSpacing: 2 },
  summaryText:{ color: Colors.textSecondary, fontSize: Typography.size.base, lineHeight: 26 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerBadge: {
    backgroundColor: Colors.primarySubtle, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primaryMuted,
  },
  footerBadgeText: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  footerNote:      { color: Colors.textMuted, fontSize: Typography.size.xs, fontStyle: 'italic' },
});
