import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { Button } from './Button';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-tree confirm dialog (reliable on iOS/web; RN Alert is flaky in-game). */
export function ConfirmOverlay({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityRole="button" />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Button title={cancelText} variant="ghost" onPress={onCancel} disabled={busy} />
          <Button
            title={confirmText}
            variant={destructive ? 'danger' : 'primary'}
            onPress={onConfirm}
            disabled={busy}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50000,
    elevation: 50000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radii.lg,
    ...surfaces.panel,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    padding: spacing.lg,
    zIndex: 1,
  },
  title: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
