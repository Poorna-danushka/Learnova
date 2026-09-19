import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { CodeBlock } from './ai/CodeBlock';
import { TableBlock } from './ai/TableBlock';

interface AIResponseRendererProps {
  content: string;
}

// Block AST Definition
type ASTBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'numbered_list'; items: string[] }
  | { type: 'code_block'; language?: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quick_check'; question: string; options?: string[] };

/**
 * Robust, lightweight Markdown AST parser tailored for Learnova Mobile AI responses.
 */
function parseMarkdownToAST(rawContent: string): ASTBlock[] {
  const blocks: ASTBlock[] = [];
  const lines = rawContent.split(/\r?\n/);
  let idx = 0;

  while (idx < lines.length) {
    const line = lines[idx];
    const trimmed = line.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      idx++;
      continue;
    }

    // 2. Code block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      idx++;
      while (idx < lines.length && !lines[idx].trim().startsWith('```')) {
        codeLines.push(lines[idx]);
        idx++;
      }
      if (idx < lines.length) idx++; // skip closing ```
      blocks.push({
        type: 'code_block',
        language: language || undefined,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 3. Table (| header | header |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (idx < lines.length && lines[idx].trim().startsWith('|')) {
        tableLines.push(lines[idx].trim());
        idx++;
      }
      const parsedTable = parseTableLines(tableLines);
      if (parsedTable) {
        blocks.push(parsedTable);
        continue;
      }
    }

    // 4. Headings (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      idx++;
      continue;
    }

    // 5. Bullet list (- item, * item, • item)
    if (/^[\*\-\•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (idx < lines.length && /^[\*\-\•]\s+/.test(lines[idx].trim())) {
        items.push(lines[idx].trim().replace(/^[\*\-\•]\s+/, ''));
        idx++;
      }
      blocks.push({ type: 'bullet_list', items });
      continue;
    }

    // 6. Numbered list (1. item, 2. item)
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (idx < lines.length && /^\d+[\.\)]\s+/.test(lines[idx].trim())) {
        items.push(lines[idx].trim().replace(/^\d+[\.\)]\s+/, ''));
        idx++;
      }
      blocks.push({ type: 'numbered_list', items });
      continue;
    }

    // 7. Quick check section
    if (trimmed.toLowerCase().startsWith('quick check')) {
      const question = trimmed.replace(/^quick check[:\s]*/i, '').trim();
      idx++;
      const options: string[] = [];
      while (idx < lines.length && lines[idx].trim().startsWith('[')) {
        options.push(lines[idx].trim().replace(/^\[|\]$/g, ''));
        idx++;
      }
      blocks.push({
        type: 'quick_check',
        question: question || 'Test your understanding:',
        options: options.length > 0 ? options : undefined,
      });
      continue;
    }

    // 8. Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = [];
    while (
      idx < lines.length &&
      lines[idx].trim() &&
      !lines[idx].trim().startsWith('```') &&
      !lines[idx].trim().startsWith('|') &&
      !/^(#{1,4})\s+/.test(lines[idx].trim()) &&
      !/^[\*\-\•]\s+/.test(lines[idx].trim()) &&
      !/^\d+[\.\)]\s+/.test(lines[idx].trim())
    ) {
      paraLines.push(lines[idx].trim());
      idx++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paraLines.join(' '),
      });
    }
  }

  return blocks;
}

function parseTableLines(lines: string[]): ASTBlock | null {
  if (lines.length === 0) return null;
  const parseRow = (line: string) =>
    line
      .split('|')
      .map((c) => c.trim())
      .filter((c, i, a) => (i > 0 && i < a.length - 1) || c.length > 0);

  const rawHeader = parseRow(lines[0]);
  let dataLines = lines.slice(1);

  // Filter out Markdown table divider row (|---|---|)
  if (dataLines.length > 0 && /^\|?\s*:?-+:?\s*\|/.test(dataLines[0])) {
    dataLines = dataLines.slice(1);
  }

  const rows = dataLines.map(parseRow);
  return {
    type: 'table',
    headers: rawHeader,
    rows,
  };
}

/**
 * Parses inline formatting: **bold**, *italic*, `inline code`
 * and converts into styled React Native Text components.
 */
function renderInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Pattern matches: **bold**, *italic*, or `code`
  const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**')) {
      elements.push(
        <Text key={match.index} style={s.inlineBold}>
          {match[2]}
        </Text>
      );
    } else if (fullMatch.startsWith('`')) {
      elements.push(
        <Text key={match.index} style={s.inlineCode}>
          {match[4]}
        </Text>
      );
    } else if (fullMatch.startsWith('*')) {
      elements.push(
        <Text key={match.index} style={s.inlineItalic}>
          {match[3]}
        </Text>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

export function AIResponseRenderer({ content }: AIResponseRendererProps) {
  const blocks = parseMarkdownToAST(content);

  return (
    <View style={s.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const isH1 = block.level === 1;
            const isH2 = block.level === 2;
            return (
              <View key={idx} style={s.headingWrap}>
                <Text style={[s.headingText, isH1 ? s.h1 : isH2 ? s.h2 : s.h3]}>
                  {renderInlineText(block.text)}
                </Text>
              </View>
            );
          }

          case 'paragraph':
            return (
              <Text key={idx} style={s.paragraphText} selectable>
                {renderInlineText(block.text)}
              </Text>
            );

          case 'bullet_list':
            return (
              <View key={idx} style={s.listWrap}>
                {block.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={s.listRow}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.listText} selectable>
                      {renderInlineText(item)}
                    </Text>
                  </View>
                ))}
              </View>
            );

          case 'numbered_list':
            return (
              <View key={idx} style={s.listWrap}>
                {block.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={s.listRow}>
                    <Text style={s.numLabel}>{itemIdx + 1}.</Text>
                    <Text style={s.listText} selectable>
                      {renderInlineText(item)}
                    </Text>
                  </View>
                ))}
              </View>
            );

          case 'code_block':
            return <CodeBlock key={idx} language={block.language} code={block.code} />;

          case 'table':
            return (
              <TableBlock
                key={idx}
                headers={block.headers}
                rows={block.rows}
                renderInline={renderInlineText}
              />
            );

          case 'quick_check':
            return (
              <View key={idx} style={s.quickCheckWrap}>
                <View style={s.quickCheckHeader}>
                  <Text style={s.quickCheckIcon}>🎯</Text>
                  <Text style={s.quickCheckTitle}>Quick Check</Text>
                </View>
                <Text style={s.quickCheckQuestion}>{renderInlineText(block.question)}</Text>
                {block.options && (
                  <View style={s.optionsRow}>
                    {block.options.map((opt, oIdx) => (
                      <View key={oIdx} style={s.optBadge}>
                        <Text style={s.optText}>{opt}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );

          default:
            return null;
        }
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },

  // Headings
  headingWrap: {
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  headingText: {
    color: Colors.textPrimary,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.tight,
  },
  h1: {
    fontSize: Typography.size.lg,
    lineHeight: 24,
    color: Colors.primaryLight,
  },
  h2: {
    fontSize: Typography.size.base,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: Typography.size.sm,
    lineHeight: 20,
    color: Colors.textSecondary,
  },

  // Paragraph
  paragraphText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 21,
  },

  // Inline formatting
  inlineBold: {
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  inlineItalic: {
    fontStyle: 'italic',
    color: Colors.textSecondary,
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: Colors.surfaceAlt,
    color: Colors.primaryLight,
    fontSize: 12,
    borderRadius: Radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  // Lists
  listWrap: {
    gap: 6,
    marginVertical: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingLeft: 4,
  },
  bulletDot: {
    color: Colors.primaryLight,
    fontSize: Typography.size.base,
    lineHeight: 20,
    fontWeight: Typography.weight.bold,
  },
  numLabel: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    lineHeight: 20,
    fontWeight: Typography.weight.bold,
    minWidth: 18,
  },
  listText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },

  // Quick check
  quickCheckWrap: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  quickCheckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickCheckIcon: {
    fontSize: 14,
  },
  quickCheckTitle: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quickCheckQuestion: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    lineHeight: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  optBadge: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  optText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
});
