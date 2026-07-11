import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  compact?: boolean;
}

export function TextField({ label, error, compact, style, secureTextEntry, ...rest }: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSecure = !!secureTextEntry;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.textDim}
          secureTextEntry={isSecure && !passwordVisible}
          style={[
            styles.input,
            compact && styles.inputCompact,
            isSecure && styles.inputSecure,
            compact && isSecure && styles.inputSecureCompact,
            error && styles.inputError,
            style,
          ]}
          {...rest}
        />
        {isSecure && (
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            style={[styles.toggle, compact && styles.toggleCompact]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={compact ? 18 : 22}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
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
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
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
  inputSecure: {
    paddingRight: 44,
  },
  inputSecureCompact: {
    paddingRight: 38,
  },
  toggle: {
    position: 'absolute',
    right: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  toggleCompact: {
    right: 6,
  },
  inputError: { borderColor: colors.danger },
  error: {
    color: colors.danger,
    marginTop: 6,
    fontSize: 12,
    fontFamily: fonts.body,
  },
});
