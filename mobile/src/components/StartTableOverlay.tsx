import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

interface Props {
  visible: boolean;
  startCount: number;
  maxPlayers: number;
  busy?: boolean;
  onConfirm: () => void;
}

/** In-tree overlay (avoids iOS native Modal crashes during lobby start). */
export function StartTableOverlay({
  visible,
  startCount,
  maxPlayers,
  busy,
  onConfirm,
}: Props) {
  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Table full</Text>
          <Text style={styles.title}>Everyone&apos;s here</Text>
          <Text style={styles.body}>
            Tap Start when you&apos;re ready. The game begins once all players confirm.
          </Text>
          <Text style={styles.meta}>
            {startCount}/{maxPlayers} tapped Start
          </Text>
          <Button
            title="Start"
            onPress={onConfirm}
            disabled={busy}
            style={styles.btn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    alignItems: 'center',
  },
  kicker: {
    color: colors.accentBright,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 26,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  meta: {
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: spacing.md,
  },
  btn: {
    marginTop: spacing.md,
    minWidth: 160,
  },
});
