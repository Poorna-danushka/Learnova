import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

interface DeleteConfirmModalProps {
  visible: boolean;
  title?: string;
  itemTitle?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  visible,
  title = 'Delete Conversation',
  itemTitle,
  description = 'Are you sure you want to delete this conversation? This action cannot be undone and all message history will be permanently lost.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={s.backdrop}
        onPress={loading ? undefined : onClose}
        accessibilityRole="button"
        accessibilityLabel="Close dialog"
      >
        <Pressable
          style={s.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Icon Badge */}
          <View style={s.iconRing}>
            <View style={s.iconInner}>
              <Text style={s.iconText}>🗑️</Text>
            </View>
          </View>

          {/* Text Content */}
          <View style={s.content}>
            <Text style={s.title}>{title}</Text>
            
            {itemTitle ? (
              <View style={s.itemBadge}>
                <Text style={s.itemIcon}>💬</Text>
                <Text style={s.itemText} numberOfLines={2}>
                  {itemTitle}
                </Text>
              </View>
            ) : null}

            <Text style={s.description}>{description}</Text>
          </View>

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                s.btn,
                s.cancelBtn,
                pressed && s.btnPressed,
                loading && s.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={s.cancelBtnText}>{cancelText}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                s.btn,
                s.deleteBtn,
                pressed && s.btnPressed,
                loading && s.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={s.deleteBtnText}>✨ {confirmText}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)' } : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.errorMuted,
    borderWidth: 2,
    borderColor: Colors.error + '30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.black,
    textAlign: 'center',
    letterSpacing: Typography.tracking.tight,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.xs,
    maxWidth: '100%',
  },
  itemIcon: {
    fontSize: 14,
  },
  itemText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    flexShrink: 1,
  },
  description: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: Typography.weight.medium,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  deleteBtn: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteBtnText: {
    color: Colors.white,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.black,
  },
});
