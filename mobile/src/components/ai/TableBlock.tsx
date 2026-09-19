import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface TableBlockProps {
  headers: string[];
  rows: string[][];
  renderInline: (text: string) => React.ReactNode;
}

export function TableBlock({ headers, rows, renderInline }: TableBlockProps) {
  if (headers.length === 0 && rows.length === 0) return null;

  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s.scroll}>
        <View style={s.table}>
          {/* Header row */}
          {headers.length > 0 && (
            <View style={s.headerRow}>
              {headers.map((header, colIdx) => (
                <View key={colIdx} style={[s.cell, s.headerCell]}>
                  <Text style={s.headerText}>{renderInline(header)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Data rows */}
          {rows.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[s.dataRow, rowIdx % 2 === 1 && s.dataRowAlt]}
            >
              {row.map((cell, colIdx) => (
                <View key={colIdx} style={s.cell}>
                  <Text style={s.cellText}>{renderInline(cell)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  scroll: {
    width: '100%',
  },
  table: {
    minWidth: 280,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primarySubtle,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primaryMuted,
  },
  headerCell: {
    paddingVertical: Spacing.sm,
  },
  headerText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.3,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dataRowAlt: {
    backgroundColor: Colors.surfaceAlt,
  },
  cell: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 100,
    maxWidth: 220,
    justifyContent: 'center',
  },
  cellText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    lineHeight: 18,
  },
});
