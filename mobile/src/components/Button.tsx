import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'goldOutline';
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  compact,
  style,
}: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        variant === 'goldOutline' && styles.goldOutline,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          variant === 'ghost' && styles.ghostText,
          variant === 'danger' && styles.dangerText,
          variant === 'goldOutline' && styles.goldOutlineText,
          variant === 'primary' && styles.primaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: 0,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: radii.sm,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    ...surfaces.chip,
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: 'rgba(232,93,93,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,93,93,0.65)',
  },
  goldOutline: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  textCompact: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
  primaryText: { color: colors.ink },
  ghostText: { color: colors.text },
  dangerText: { color: colors.danger },
  goldOutlineText: { color: colors.accentBright },
});
