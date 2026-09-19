import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export function CodeBlock({ language = 'CODE', code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy code', e);
    }
  };

  const displayLang = (language || 'CODE').toUpperCase();

  return (
    <View style={s.container}>
      {/* Code Header */}
      <View style={s.header}>
        <View style={s.langBadge}>
          <Text style={s.langText}>{displayLang}</Text>
        </View>
        <Pressable
          onPress={handleCopy}
          hitSlop={8}
          style={({ pressed }) => [s.copyBtn, pressed && s.copyBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Copy code to clipboard"
        >
          <Text style={s.copyIcon}>{copied ? '✓' : '📋'}</Text>
          <Text style={[s.copyLabel, copied && s.copyLabelCopied]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </Pressable>
      </View>

      {/* Code Body */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={s.scrollContent}
        style={s.codeScroll}
      >
        <Text style={s.codeText} selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  langBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  langText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  copyBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  copyIcon: {
    fontSize: 12,
    color: '#94A3B8',
  },
  copyLabel: {
    color: '#94A3B8',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  copyLabelCopied: {
    color: '#4ADE80',
    fontWeight: Typography.weight.bold,
  },
  codeScroll: {
    maxHeight: 380,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  codeText: {
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
