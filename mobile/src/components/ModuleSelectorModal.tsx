import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { Module } from '@/services/api/moduleApi';

interface ModuleSelectorModalProps {
  visible: boolean;
  modules: Module[];
  onSelect: (moduleId: number) => void;
  onCreateModule: () => void;
  onClose: () => void;
  title?: string;
  emptyMessage?: string;
}

export function ModuleSelectorModal({
  visible,
  modules,
  onSelect,
  onCreateModule,
  onClose,
  title = 'Select Module',
  emptyMessage = 'Create your first module to get started',
}: ModuleSelectorModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.modal} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <Text style={s.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {/* Content */}
          {modules.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Text style={s.emptyEmoji}>📚</Text>
              </View>
              <Text style={s.emptyTitle}>No modules yet</Text>
              <Text style={s.emptyText}>{emptyMessage}</Text>
              <Pressable
                onPress={() => {
                  onClose();
                  onCreateModule();
                }}
                style={s.createBtn}
              >
                <Text style={s.createBtnText}>+ Create First Module</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
              {modules.map((module) => (
                <Pressable
                  key={module.id}
                  onPress={() => {
                    onSelect(module.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    s.moduleItem,
                    pressed && s.moduleItemPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <View style={[s.moduleDot, { backgroundColor: module.color || Colors.primary }]} />
                  <View style={s.moduleInfo}>
                    <Text style={s.moduleName}>{module.name}</Text>
                    {module.description && (
                      <Text style={s.moduleDesc} numberOfLines={1}>
                        {module.description}
                      </Text>
                    )}
                  </View>
                  <Text style={s.moduleArrow}>›</Text>
                </Pressable>
              ))}

              {/* Create new option */}
              <Pressable
                onPress={() => {
                  onClose();
                  onCreateModule();
                }}
                style={({ pressed }) => [
                  s.createOption,
                  pressed && s.moduleItemPressed,
                ]}
                accessibilityRole="button"
              >
                <View style={[s.createIconWrap]}>
                  <Text style={s.createIcon}>+</Text>
                </View>
                <Text style={s.createOptionText}>Create New Module</Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    ...Shadow.lg,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  closeBtn: {
    color: Colors.textMuted,
    fontSize: 24,
    fontWeight: Typography.weight.regular,
  },
  list: {
    maxHeight: 400,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  moduleItemPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  moduleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  moduleDesc: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    marginTop: 2,
  },
  moduleArrow: {
    color: Colors.textMuted,
    fontSize: 24,
    fontWeight: Typography.weight.regular,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  createIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIcon: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: Typography.weight.bold,
  },
  createOptionText: {
    color: Colors.primary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  createBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadow.md,
  },
  createBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
});