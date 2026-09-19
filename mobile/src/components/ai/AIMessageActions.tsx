import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface AIMessageActionsProps {
  messageContent: string;
  onRegenerate?: () => void;
}

export function AIMessageActions({ messageContent, onRegenerate }: AIMessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = async () => {
    try {
      // Strip markdown syntax symbols for clean plain text clipboard
      const plainText = messageContent
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*\n?/gi, '').replace(/```/g, ''))
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[\*\-]\s+/gm, '• ');

      await Clipboard.setStringAsync(plainText.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy text', e);
    }
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback((prev) => (prev === type ? null : type));
  };

  return (
    <View style={s.actionsRow}>
      {/* Copy Action */}
      <Pressable
        onPress={handleCopy}
        hitSlop={6}
        style={({ pressed }) => [s.actionBtn, pressed && s.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Copy response"
      >
        <Text style={s.actionIcon}>{copied ? '✓' : '📋'}</Text>
        <Text style={[s.actionLabel, copied && s.actionLabelActive]}>
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </Pressable>

      {/* Regenerate Action */}
      {onRegenerate && (
        <Pressable
          onPress={onRegenerate}
          hitSlop={6}
          style={({ pressed }) => [s.actionBtn, pressed && s.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Regenerate response"
        >
          <Text style={s.actionIcon}>🔄</Text>
          <Text style={s.actionLabel}>Regenerate</Text>
        </Pressable>
      )}

      {/* Thumbs Up */}
      <Pressable
        onPress={() => handleFeedback('like')}
        hitSlop={6}
        style={({ pressed }) => [
          s.actionBtn,
          s.iconOnlyBtn,
          feedback === 'like' && s.feedbackActiveLike,
          pressed && s.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Helpful response"
      >
        <Text style={s.actionIcon}>👍</Text>
      </Pressable>

      {/* Thumbs Down */}
      <Pressable
        onPress={() => handleFeedback('dislike')}
        hitSlop={6}
        style={({ pressed }) => [
          s.actionBtn,
          s.iconOnlyBtn,
          feedback === 'dislike' && s.feedbackActiveDislike,
          pressed && s.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Unhelpful response"
      >
        <Text style={s.actionIcon}>👎</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  iconOnlyBtn: {
    paddingHorizontal: 8,
  },
  actionIcon: {
    fontSize: 12,
  },
  actionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: Typography.weight.medium,
  },
  actionLabelActive: {
    color: Colors.success,
    fontWeight: Typography.weight.bold,
  },
  feedbackActiveLike: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success + '40',
  },
  feedbackActiveDislike: {
    backgroundColor: Colors.errorMuted,
    borderColor: Colors.error + '40',
  },
});
