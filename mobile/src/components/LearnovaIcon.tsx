// ─── Learnova Brand Logo ─────────────────────────────────────────────────────
// Icon image + "Learnova" wordmark with gradient colors
// Matches official Learnova branding: "Lear" (dark) + "no" (teal) + "va" (purple)
// Usage: <LearnovaIcon size={80} />

import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { Typography } from '@/constants/theme';

interface LearnovaIconProps {
  size?: number;
  style?: ViewStyle;
}

export function LearnovaIcon({ size = 80, style }: LearnovaIconProps) {
  const iconSize = size * 0.85; // Icon is 85% of total size
  const textSize = size * 0.45; // Text is 45% of total size

  return (
    <View style={[styles.container, style]}>
      {/* Book icon image */}
      <Image
        source={require('../../assets/icon.png')}
        style={{ 
          width: iconSize, 
          height: iconSize,
          borderRadius: iconSize * 0.227 // iOS rounded corners
        }}
        resizeMode="contain"
      />

      {/* Learnova wordmark: "Lear" (dark) + "no" (teal) + "va" (purple) */}
      <Text style={[styles.wordmark, { fontSize: textSize }]}>
        <Text style={styles.lear}>Lear</Text>
        <Text style={styles.no}>no</Text>
        <Text style={styles.va}>va</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  wordmark: {
    fontWeight: Typography.weight.black,
    letterSpacing: 0.5,
  },
  
  lear: {
    color: '#1E293B', // Dark slate/navy
  },
  
  no: {
    color: '#0EA5A0', // Teal from brand
  },
  
  va: {
    color: '#8B5CF6', // Purple from brand
  },
});
