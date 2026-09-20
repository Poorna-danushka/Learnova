// ─── Learnova UI Component Library ───────────────────────────────────────────
// All reusable primitive UI components for the Learnova mobile app.
// Import from '@/components/ui' throughout the app.

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { HomeIcon, ModulesIcon, PlannerIcon, NotesIcon, ProfileIcon } from '@/components/NavIcons';

// ─── Re-export colors for backwards compatibility ─────────────────────────────
export const colors = {
  bg:           Colors.bg,
  surface:      Colors.surface,
  surfaceRaised:Colors.surfaceAlt,
  border:       Colors.border,
  text:         Colors.textPrimary,
  muted:        Colors.textMuted,
  primary:      Colors.primary,
  primaryBright:Colors.primaryLight,
  success:      Colors.success,
  danger:       Colors.error,
  warning:      Colors.warning,
};

// ─── Screen Container ─────────────────────────────────────────────────────────
export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

// ─── Keyboard Aware Screen ────────────────────────────────────────────────────
export function KeyboardScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── App Header ───────────────────────────────────────────────────────────────
export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {(onBack || right) && (
        <View style={styles.headerTop}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              hitSlop={12}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.backChevron}>←</Text>
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {right && <View style={styles.headerRight}>{right}</View>}
        </View>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Screen Title Header (compact, for list screens) ─────────────────────────
export function ScreenHeader({
  title,
  onBack,
  action,
  onAction,
  subtitle,
}: {
  title: string;
  onBack?: () => void;
  action?: React.ReactNode;
  onAction?: () => void;
  subtitle?: string;
}) {
  return (
    <View style={styles.screenHeaderWrap}>
      <View style={styles.screenHeaderRow}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.screenHeaderBack, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backChevron}>←</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.screenHeaderTitle}>{title}</Text>
          {subtitle ? <Text style={styles.screenHeaderSub}>{subtitle}</Text> : null}
        </View>
        {action && <View>{action}</View>}
      </View>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  noPadding,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
}) {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          noPadding && { padding: 0 },
          style,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, noPadding && { padding: 0 }, style]}>{children}</View>;
}

// ─── Surface (lighter weight than Card) ───────────────────────────────────────
export function Surface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

// ─── Button ───────────────────────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
  icon,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}) {
  const variantStyle = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    ghost: styles.btnGhost,
    danger: styles.btnDanger,
    success: styles.btnSuccess,
  }[variant];

  const textStyle = {
    primary: styles.btnTextPrimary,
    secondary: styles.btnTextSecondary,
    ghost: styles.btnTextGhost,
    danger: styles.btnTextDanger,
    success: styles.btnTextSuccess,
  }[variant];

  const sizeStyle = {
    sm: styles.btnSm,
    md: styles.btnMd,
    lg: styles.btnLg,
  }[size];

  const loaderColor = variant === 'primary' || variant === 'success' ? Colors.white : Colors.primaryLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variantStyle,
        sizeStyle,
        !fullWidth && styles.btnInline,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={loaderColor} size="small" />
      ) : (
        <View style={styles.btnInner}>
          {icon && <View style={styles.btnIconSlot}>{icon}</View>}
          <Text style={[styles.btnText, textStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 40,
  color,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'ghost' | 'filled' | 'danger';
  size?: number;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'filled' && styles.iconBtnFilled,
        variant === 'danger' && styles.iconBtnDanger,
        color ? { backgroundColor: color + '22', borderColor: color + '44' } : {},
        pressed && styles.btnPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ─── Field / Input ────────────────────────────────────────────────────────────
export function Field({
  label,
  error,
  hint,
  required,
  ...props
}: TextInputProps & { label?: string; error?: string; hint?: string; required?: boolean }) {
  const isFocused = useRef(false);
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={styles.field}>
      {label && (
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {required && <Text style={styles.fieldRequired}>*</Text>}
        </View>
      )}
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={Colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          props.multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          error && styles.inputError,
          props.style as any,
        ]}
      />
      {hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {error && (
        <View style={styles.fieldErrorRow}>
          <Text style={styles.fieldErrorDot}>●</Text>
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Password Field (with show/hide toggle) ───────────────────────────────────
export function PasswordField({
  label,
  error,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  error?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.passwordWrap, focused && styles.inputFocused, error && styles.inputError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.passwordInput}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eyeBtn}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Text style={styles.eyeIcon}>{visible ? '◎' : '○'}</Text>
        </Pressable>
      </View>
      {error && (
        <View style={styles.fieldErrorRow}>
          <Text style={styles.fieldErrorDot}>●</Text>
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────
export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.searchRow, focused && styles.searchFocused]}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear || (() => onChangeText(''))}
          hitSlop={8}
          style={styles.searchClearBtn}
        >
          <Text style={styles.searchClear}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
export function Chip({
  label,
  active,
  onPress,
  color,
  count,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  count?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && [
          styles.chipActive,
          color ? { backgroundColor: color + '20', borderColor: color + '60' } : {},
        ],
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active && [styles.chipTextActive, color ? { color } : {}],
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View style={[styles.chipCount, active && styles.chipCountActive]}>
          <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({
  label,
  color = Colors.primary,
  size = 'sm',
}: {
  label: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const sizeStyle = {
    xs: styles.badgeXs,
    sm: styles.badgeSm,
    md: styles.badgeMd,
  }[size];

  const textSize = {
    xs: styles.badgeTextXs,
    sm: styles.badgeTextSm,
    md: styles.badgeTextMd,
  }[size];

  return (
    <View
      style={[
        styles.badge,
        sizeStyle,
        { backgroundColor: color + '18', borderColor: color + '40' },
      ]}
    >
      <Text style={[styles.badgeText, textSize, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 44,
  color = Colors.primary,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '25',
          borderColor: color + '50',
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { fontSize: size * 0.36, color, letterSpacing: size * 0.015 },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({
  progress,
  color = Colors.primary,
  height = 5,
  style,
  showLabel,
}: {
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
  showLabel?: boolean;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  return (
    <View style={[{ gap: 4 }, style]}>
      {showLabel && (
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={[styles.progressValue, { color }]}>{clampedProgress}%</Text>
        </View>
      )}
      <View style={[styles.progressTrack, { height }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${clampedProgress}%`, backgroundColor: color, height },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({
  value,
  label,
  color = Colors.primaryLight,
  icon,
}: {
  value: string | number;
  label: string;
  color?: string;
  icon?: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '25' }]}>
      {icon && <Text style={[styles.statIcon, { color }]}>{icon}</Text>}
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.sectionAction}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style, label }: { style?: ViewStyle; label?: string }) {
  if (label) {
    return (
      <View style={[styles.dividerRow, style]}>
        <View style={styles.divider} />
        <Text style={styles.dividerLabel}>{label}</Text>
        <View style={styles.divider} />
      </View>
    );
  }
  return <View style={[styles.divider, style]} />;
}

// ─── Message Banner ───────────────────────────────────────────────────────────
export function Message({
  children,
  tone = 'error',
  onDismiss,
}: {
  children: React.ReactNode;
  tone?: 'error' | 'success' | 'warning' | 'info';
  onDismiss?: () => void;
}) {
  const toneStyles = {
    error:   { bg: Colors.errorMuted,   border: Colors.error + '50',   text: Colors.errorLight,   icon: '⚠' },
    success: { bg: Colors.successMuted, border: Colors.success + '50', text: Colors.successLight,  icon: '✓' },
    warning: { bg: Colors.warningMuted, border: Colors.warning + '50', text: Colors.warningLight,  icon: '⚠' },
    info:    { bg: Colors.infoMuted,    border: Colors.info + '50',    text: Colors.infoLight,     icon: 'ℹ' },
  }[tone];

  return (
    <View style={[styles.message, { backgroundColor: toneStyles.bg, borderColor: toneStyles.border }]}>
      <Text style={[styles.messageIcon, { color: toneStyles.text }]}>{toneStyles.icon}</Text>
      <Text style={[styles.messageText, { color: toneStyles.text }]}>{children}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.messageDismiss}>
          <Text style={[styles.messageDismissText, { color: toneStyles.text }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  text,
  action,
  onAction,
  icon = '◈',
}: {
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
  icon?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <View style={styles.emptyTextGroup}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {text && <Text style={styles.emptyText}>{text}</Text>}
      </View>
      {action && onAction && (
        <Button label={action} onPress={onAction} variant="secondary" size="sm" fullWidth={false} />
      )}
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
export function ErrorState({
  title = 'Something went wrong',
  text,
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: Colors.errorMuted, borderColor: Colors.error + '30' }]}>
        <Text style={[styles.emptyIcon, { color: Colors.error }]}>!</Text>
      </View>
      <View style={styles.emptyTextGroup}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {text && <Text style={styles.emptyText}>{text}</Text>}
      </View>
      {onRetry && (
        <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" fullWidth={false} />
      )}
    </View>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={Colors.primaryLight} size="large" />
      {label && <Text style={styles.loadingLabel}>{label}</Text>}
    </View>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
export function SkeletonLine({
  width = '100%',
  height = 16,
  style,
  borderRadius,
}: {
  width?: string | number;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, opacity, borderRadius: borderRadius ?? Radius.sm },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ height, style }: { height?: number; style?: ViewStyle } = {}) {
  return (
    <View style={[styles.skeletonCard, height !== undefined && { height }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <SkeletonLine width={40} height={40} borderRadius={Radius.md} />
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <SkeletonLine width="65%" height={16} />
          <SkeletonLine width="40%" height={12} />
        </View>
      </View>
      <SkeletonLine width="100%" height={6} borderRadius={Radius.full} />
    </View>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['100%', '85%', '70%', '90%', '60%'];
  return (
    <View style={{ gap: Spacing.sm }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} height={14} />
      ))}
    </View>
  );
}

// ─── Segmented Control ────────────────────────────────────────────────────────
export function SegmentedControl({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (opt: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === opt }}
          style={[
            styles.segmentItem,
            selected === opt && styles.segmentActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              selected === opt && styles.segmentTextActive,
            ]}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
export function ListRow({
  label,
  value,
  icon,
  onPress,
  destructive,
  right,
  subtitle,
}: {
  label: string;
  value?: string;
  icon?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  const labelColor = destructive ? Colors.error : Colors.textPrimary;

  const inner = (
    <>
      {icon && (
        <View
          style={[
            styles.listRowIcon,
            {
              backgroundColor: destructive
                ? Colors.errorMuted
                : Colors.surfaceElevated,
              borderColor: destructive ? Colors.error + '30' : Colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.listRowIconText,
              { color: destructive ? Colors.error : Colors.primaryLight },
            ]}
          >
            {icon}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.listRowLabel, { color: labelColor }]}>{label}</Text>
        {subtitle && <Text style={styles.listRowSubtitle}>{subtitle}</Text>}
      </View>
      {right ? (
        right
      ) : value ? (
        <Text style={styles.listRowValue}>{value}</Text>
      ) : onPress ? (
        <Text style={styles.listRowChevron}>›</Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.65 }]}
        accessibilityRole="button"
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.listRow}>{inner}</View>;
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Home',    route: '/(tabs)',   IconComponent: HomeIcon },
  { label: 'Modules', route: '/modules',  IconComponent: ModulesIcon },
  { label: 'Planner', route: '/planning', IconComponent: PlannerIcon },
  { label: 'Notes',   route: '/notes',    IconComponent: NotesIcon },
  { label: 'Profile', route: '/profile',  IconComponent: ProfileIcon },
] as const;

export function BottomNav({
  active = 'Home',
  onNavigate,
}: {
  active?: string;
  onNavigate: (route: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.nav,
        { bottom: Math.max(Spacing.base, insets.bottom + Spacing.xs) },
      ]}
    >
      {NAV_ITEMS.map(({ label, route, IconComponent }) => {
        const isActive = active === label;
        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.navItem,
              pressed && !isActive && { opacity: 0.6 },
            ]}
            onPress={() => onNavigate(route)}
          >
            {isActive && <View style={styles.navActiveBar} />}
            <View
              style={[
                styles.navIconWrap,
                isActive && styles.navIconWrapActive,
              ]}
            >
              <IconComponent
                color={isActive ? Colors.primaryLight : Colors.textMuted}
                size={20}
                active={isActive}
              />
            </View>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Confirm Dialog (cross-platform) ─────────────────────────────────────────
export function InlineConfirm({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
  variant = 'danger',
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}) {
  return (
    <View style={styles.confirmWrap}>
      <Text style={styles.confirmTitle}>{title}</Text>
      <Text style={styles.confirmMessage}>{message}</Text>
      <View style={styles.confirmActions}>
        <Button label="Cancel" onPress={onCancel} variant="ghost" size="sm" fullWidth={false} />
        <Button label={confirmLabel} onPress={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" fullWidth={false} />
      </View>
    </View>
  );
}

// ─── Tag / Pill ───────────────────────────────────────────────────────────────
export function Tag({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove?: () => void;
}) {
  const tagColor = color || Colors.primaryLight;
  return (
    <View style={[styles.tag, { backgroundColor: tagColor + '18', borderColor: tagColor + '35' }]}>
      <Text style={[styles.tagText, { color: tagColor }]}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={4} style={styles.tagRemove}>
          <Text style={[styles.tagRemoveText, { color: tagColor }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Floating Action Button ───────────────────────────────────────────────────
export function FAB({
  onPress,
  label,
  icon = '+',
}: {
  onPress: () => void;
  label?: string;
  icon?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label || 'Add'}
      style={({ pressed }) => [
        styles.fab,
        pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
      ]}
    >
      <Text style={styles.fabIcon}>{icon}</Text>
      {label && <Text style={styles.fabLabel}>{label}</Text>}
    </Pressable>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
export function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <View style={styles.stepRow}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                done && styles.stepCircleDone,
                active && styles.stepCircleActive,
              ]}
            >
              {done ? (
                <Text style={styles.stepCheckmark}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.stepNum,
                    active && styles.stepNumActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                active && styles.stepLabelActive,
                done && styles.stepLabelDone,
              ]}
            >
              {label}
            </Text>
            {i < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  (done || (active && i < current)) && styles.stepConnectorDone,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Screen ──────────────────────────────────────────────────────────────────
  safe:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { paddingBottom: 132 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header:         { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  headerTop:      {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  backChevron:    {
    color: Colors.primaryLight,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
  },
  backLabel:      {
    color: Colors.primaryLight,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  headerTitle:    {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    lineHeight: 36,
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    lineHeight: 20,
    marginTop: 2,
  },

  // ── Screen Header ────────────────────────────────────────────────────────────
  screenHeaderWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  screenHeaderBack: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  screenHeaderTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  screenHeaderSub: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },

  // ── Card & Surface ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  surface: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ── Button ───────────────────────────────────────────────────────────────────
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  btnInline: { alignSelf: 'flex-start' },
  btnInner:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  btnIconSlot: { marginRight: 2 },

  btnPrimary:   { backgroundColor: Colors.primary, ...Shadow.sm },
  btnSecondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  btnGhost:   { backgroundColor: Colors.transparent },
  btnDanger:  {
    backgroundColor: Colors.errorMuted,
    borderWidth: 1,
    borderColor: Colors.error + '45',
  },
  btnSuccess: {
    backgroundColor: Colors.successMuted,
    borderWidth: 1,
    borderColor: Colors.success + '45',
  },

  btnSm: { height: 38, borderRadius: Radius.md, paddingHorizontal: Spacing.base },
  btnMd: { height: 52 },
  btnLg: { height: 56, borderRadius: Radius.xl },

  btnDisabled: { opacity: 0.42 },
  btnPressed:  { opacity: 0.78, transform: [{ scale: 0.975 }] },

  btnText:        { fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  btnTextPrimary: { color: Colors.white },
  btnTextSecondary: { color: Colors.primaryLight },
  btnTextGhost:   { color: Colors.textSecondary },
  btnTextDanger:  { color: Colors.errorLight },
  btnTextSuccess: { color: Colors.successLight },

  // ── Icon Button ──────────────────────────────────────────────────────────────
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnFilled: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBtnDanger: {
    backgroundColor: Colors.errorMuted,
    borderWidth: 1,
    borderColor: Colors.error + '35',
  },

  // ── Field ────────────────────────────────────────────────────────────────────
  field:         { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fieldLabel:    {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.1,
  },
  fieldRequired: {
    color: Colors.error,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  fieldHint: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    lineHeight: 16,
  },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fieldErrorDot: { color: Colors.error, fontSize: 6, lineHeight: 16 },
  fieldError:    { color: Colors.errorLight, fontSize: Typography.size.xs, lineHeight: 16, flex: 1 },

  input: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    minHeight: 50,
    outlineStyle: 'none' as any,
  },
  inputFocused:   { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: Colors.surface },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: Spacing.md },
  inputError:     { borderColor: Colors.error + '80' },

  // ── Password ──────────────────────────────────────────────────────────────────
  passwordWrap: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingLeft: Spacing.base,
  },
  passwordInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    paddingVertical: Spacing.md,
    outlineStyle: 'none' as any,
  },
  eyeBtn: {
    width: 46,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: { color: Colors.textMuted, fontSize: 16 },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 48,
  },
  searchFocused: { borderColor: Colors.primary },
  searchIcon:  { color: Colors.textMuted, fontSize: 17 },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    paddingVertical: 0,
    outlineStyle: 'none' as any,
  },
  searchClearBtn: { padding: 4 },
  searchClear:    { color: Colors.textMuted, fontSize: Typography.size.xs },

  // ── Chip ─────────────────────────────────────────────────────────────────────
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipActive:     { backgroundColor: Colors.primarySubtle, borderColor: Colors.primaryLight + '55' },
  chipText:       { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  chipTextActive: { color: Colors.primaryLight, fontWeight: Typography.weight.semibold },
  chipCount: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  chipCountActive:     { backgroundColor: Colors.primaryMuted },
  chipCountText:       { color: Colors.textMuted, fontSize: 10, fontWeight: Typography.weight.bold },
  chipCountTextActive: { color: Colors.primaryLight },

  // ── Badge ────────────────────────────────────────────────────────────────────
  badge:     { borderRadius: Radius.xs, borderWidth: 1, alignSelf: 'flex-start' },
  badgeXs:   { paddingHorizontal: 5, paddingVertical: 2 },
  badgeSm:   { paddingHorizontal: 7, paddingVertical: 3 },
  badgeMd:   { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeText: { fontWeight: Typography.weight.semibold },
  badgeTextXs: { fontSize: 10 },
  badgeTextSm: { fontSize: Typography.size.xs },
  badgeTextMd: { fontSize: Typography.size.sm },

  // ── Avatar ───────────────────────────────────────────────────────────────────
  avatar:     { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontWeight: Typography.weight.bold },

  // ── Progress ──────────────────────────────────────────────────────────────────
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel:    { color: Colors.textMuted, fontSize: Typography.size.xs },
  progressValue:    { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  progressTrack:    { backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden', width: '100%' },
  progressFill:     { borderRadius: Radius.full },

  // ── Stat Card ────────────────────────────────────────────────────────────────
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 3,
    borderWidth: 1,
  },
  statIcon:  { fontSize: 16, marginBottom: 1 },
  statValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  statLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center' },

  // ── Section Header ────────────────────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  sectionAction: {
    color: Colors.primaryLight,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },

  // ── Divider ───────────────────────────────────────────────────────────────────
  divider:      { height: 1, backgroundColor: Colors.border, flex: 1 },
  dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  // ── Message ───────────────────────────────────────────────────────────────────
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  messageIcon:        { fontSize: 14, lineHeight: 20, flexShrink: 0 },
  messageText:        { fontSize: Typography.size.sm, lineHeight: 20, flex: 1 },
  messageDismiss:     { paddingLeft: Spacing.xs },
  messageDismissText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState:   { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.lg },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon:      { color: Colors.primaryLight, fontSize: 22 },
  emptyTextGroup: { alignItems: 'center', gap: Spacing.sm },
  emptyTitle:     {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },

  // ── Loading ───────────────────────────────────────────────────────────────────
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['4xl'],
  },
  loadingLabel: { color: Colors.textMuted, fontSize: Typography.size.sm },

  // ── Skeleton ──────────────────────────────────────────────────────────────────
  skeleton:     { backgroundColor: Colors.surfaceElevated },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },

  // ── Segmented Control ─────────────────────────────────────────────────────────
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  segmentActive:     { backgroundColor: Colors.surfaceElevated, ...Shadow.xs },
  segmentText:       { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  segmentTextActive: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },

  // ── List Row ──────────────────────────────────────────────────────────────────
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  listRowIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  listRowIconText: { fontSize: 15 },
  listRowLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  listRowSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
  listRowValue:   { color: Colors.textMuted, fontSize: Typography.size.sm },
  listRowChevron: {
    color: Colors.textMuted,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.medium,
  },

  // ── Bottom Nav ────────────────────────────────────────────────────────────────
  nav: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    height: 72,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    ...Shadow.lg,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 54,
    gap: 4,
    position: 'relative',
  },
  navActiveBar: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2.5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
  navIconWrap: {
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  navIconWrapActive: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.md,
  },
  navIcon:       { fontSize: 18, color: Colors.textMuted },
  navIconActive: { color: Colors.primaryLight },
  navLabel:      { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.textMuted },
  navLabelActive: { color: Colors.primaryLight },

  // ── Confirm Dialog ─────────────────────────────────────────────────────────────
  confirmWrap: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  confirmTitle:   { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  confirmMessage: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },

  // ── Tag ───────────────────────────────────────────────────────────────────────
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tagText:       { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  tagRemove:     { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  tagRemoveText: { fontSize: 9, fontWeight: Typography.weight.bold },

  // ── FAB ───────────────────────────────────────────────────────────────────────
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  fabIcon:  { color: Colors.white, fontSize: 20, fontWeight: Typography.weight.black, lineHeight: 22 },
  fabLabel: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // ── Step Indicator ────────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryLight,
  },
  stepCircleDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNum:        { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  stepNumActive:  { color: Colors.primaryLight },
  stepCheckmark:  { color: Colors.white, fontSize: Typography.size.xs, fontWeight: Typography.weight.black },
  stepLabel:      { color: Colors.textMuted, fontSize: 10, fontWeight: Typography.weight.medium, textAlign: 'center' },
  stepLabelActive: { color: Colors.primaryLight, fontWeight: Typography.weight.bold },
  stepLabelDone:  { color: Colors.textSecondary },
  stepConnector: {
    position: 'absolute',
    top: 15,
    left: '50%',
    right: '-50%',
    height: 1.5,
    backgroundColor: Colors.border,
  },
  stepConnectorDone: { backgroundColor: Colors.primary },
});

export const uiStyles = styles;
