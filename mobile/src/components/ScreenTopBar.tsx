import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  title: string;
  kicker?: string;
  onBack: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}

export function ScreenTopBar({ title, kicker, onBack, backLabel = '← Back', right }: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.backChip} hitSlop={8}>
        <Text style={styles.backText}>{backLabel}</Text>
      </Pressable>
      {right}
      <View style={styles.titleBlock}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.accentBright,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 2,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.cream,
    fontSize: 26,
    fontFamily: fonts.display,
    marginTop: 2,
  },
});
