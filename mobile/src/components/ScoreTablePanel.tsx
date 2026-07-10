import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PrivateGameSnapshot } from '../models/types';
import { ScoreGrid } from './ScoreGrid';
import { colors, radii, spacing, surfaces } from '../theme';

interface Props {
  snapshot: PrivateGameSnapshot;
  open: boolean;
  onToggle: () => void;
  bottomInset?: number;
  leftInset?: number;
}

export function ScoreTablePanel({
  snapshot,
  open,
  onToggle,
  bottomInset = 8,
  leftInset = 10,
}: Props) {
  return (
    <View
      style={[styles.wrap, { left: leftInset, bottom: bottomInset }]}
      pointerEvents="box-none"
    >
      {open && (
        <View style={styles.panel}>
          <ScoreGrid snapshot={snapshot} size="compact" />
        </View>
      )}

      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.toggleBtn, open && styles.toggleBtnOn, pressed && styles.togglePressed]}
        hitSlop={8}
      >
        <Ionicons
          name={open ? 'close' : 'grid-outline'}
          size={18}
          color={open ? colors.cream : colors.accentBright}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 20001,
    elevation: 20001,
    alignItems: 'flex-start',
  },
  panel: {
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    ...surfaces.panel,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(2, 4, 8, 0.96)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    maxWidth: '96%',
    zIndex: 20002,
    elevation: 20002,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
    zIndex: 20003,
    elevation: 20003,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
