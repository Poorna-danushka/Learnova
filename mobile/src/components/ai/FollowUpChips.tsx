import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface FollowUpChipsProps {
  messageContent: string;
  onSelectPrompt: (prompt: string) => void;
}

export function FollowUpChips({ messageContent, onSelectPrompt }: FollowUpChipsProps) {
  // Dynamically derive 2-3 relevant follow-up prompts based on content analysis
  const contentLower = messageContent.toLowerCase();

  const suggestions: string[] = [];

  if (contentLower.includes('code') || contentLower.includes('class') || contentLower.includes('function') || contentLower.includes('implementation')) {
    suggestions.push('Explain the code step by step');
    suggestions.push('Show alternative implementation');
  } else {
    suggestions.push('Show me a code example');
  }

  if (contentLower.includes('vs') || contentLower.includes('difference') || contentLower.includes('compare')) {
    suggestions.push('Which one is better for performance?');
  } else {
    suggestions.push('Explain with a real-world analogy');
  }

  if (contentLower.includes('quick check') || contentLower.includes('question')) {
    suggestions.push('Give me another practice question');
  } else {
    suggestions.push('Give me an exam-style question');
  }

  // Deduplicate and take top 3
  const uniqueChips = Array.from(new Set(suggestions)).slice(0, 3);

  return (
    <View style={s.container}>
      <Text style={s.label}>Follow-up suggestions:</Text>
      <View style={s.chipsRow}>
        {uniqueChips.map((chipText, idx) => (
          <Pressable
            key={idx}
            onPress={() => onSelectPrompt(chipText)}
            style={({ pressed }) => [s.chip, pressed && s.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Ask follow-up: ${chipText}`}
          >
            <Text style={s.chipText}>{chipText}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryMuted,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipPressed: {
    opacity: 0.7,
    backgroundColor: Colors.primary + '25',
    transform: [{ scale: 0.97 }],
  },
  chipText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
});
