import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  compact?: boolean;
}

export function TextField({ label, error, compact, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, compact && styles.inputCompact, error && styles.inputError, style]}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  wrapCompact: { marginBottom: spacing.sm },
  label: {
    color: colors.accentBright,
    marginBottom: spacing.sm,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyMedium,
  },
  labelCompact: {
    marginBottom: 4,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  input: {
    ...surfaces.input,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  inputCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    fontSize: 14,
    borderRadius: radii.sm,
  },
  inputError: { borderColor: colors.danger },
  error: {
    color: colors.danger,
    marginTop: 6,
    fontSize: 12,
    fontFamily: fonts.body,
  },
});
