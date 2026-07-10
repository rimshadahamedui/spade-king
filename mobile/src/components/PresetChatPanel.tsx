import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRESET_CHAT_OPTIONS } from '../constants/presetChat';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props {
  open: boolean;
  busy?: boolean;
  onToggle: () => void;
  onSelect: (message: string) => void;
}

export function PresetChatPanel({ open, busy, onToggle, onSelect }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {open && (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Quick chat</Text>
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuList}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {PRESET_CHAT_OPTIONS.map((option) => (
              <Pressable
                key={option}
                disabled={busy}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                  busy && styles.optionDisabled,
                ]}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Pressable
        onPress={onToggle}
        disabled={busy}
        style={({ pressed }) => [
          styles.toggleBtn,
          open && styles.toggleBtnOn,
          pressed && styles.togglePressed,
        ]}
        accessibilityLabel="Preset chat"
        accessibilityRole="button"
      >
        <Ionicons
          name={open ? 'close' : 'chatbubble-ellipses-outline'}
          size={18}
          color={open ? colors.cream : colors.accentBright}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    zIndex: 20002,
    elevation: 20002,
  },
  menu: {
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    ...surfaces.panel,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(2, 4, 8, 0.96)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    maxWidth: 168,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 20003,
  },
  menuTitle: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  menuScroll: {
    maxHeight: 188,
  },
  menuList: {
    gap: 6,
    paddingBottom: 2,
  },
  option: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  optionPressed: {
    backgroundColor: 'rgba(201, 162, 39, 0.18)',
    borderColor: colors.accentBright,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionText: {
    color: colors.cream,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textAlign: 'center',
  },
  toggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 4, 8, 0.92)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 20004,
  },
  toggleBtnOn: {
    borderColor: colors.accentBright,
    backgroundColor: 'rgba(201, 162, 39, 0.22)',
  },
  togglePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
