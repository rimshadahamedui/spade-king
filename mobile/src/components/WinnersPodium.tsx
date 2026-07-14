import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerMiniAvatar } from './PlayerMiniAvatar';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export interface WinnerEntry {
  userId: string;
  username: string;
  seatIndex?: number;
  avatarId?: number | null;
  totalScore: number;
}

const TROPHY = [
  { color: '#FFD700', icon: 'trophy' as const },
  { color: '#C0C0C0', icon: 'trophy' as const },
  { color: '#CD7F32', icon: 'trophy' as const },
];

interface Props {
  players: WinnerEntry[];
  /** Show top N players by total score (default 3). */
  topCount?: number;
}

export function WinnersPodium({ players, topCount = 3 }: Props) {
  const ranked = [...players]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, topCount);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Winners</Text>
      <View style={styles.list}>
        {ranked.map((p, idx) => {
          const trophy = TROPHY[idx] ?? null;

          return (
            <View key={p.userId} style={[styles.row, idx === 0 && styles.rowFirst]}>
              <View style={styles.left}>
                {trophy ? (
                  <Ionicons name={trophy.icon} size={28} color={trophy.color} />
                ) : (
                  <Text style={styles.plainRank}>#{idx + 1}</Text>
                )}
                <PlayerMiniAvatar
                  username={p.username}
                  avatarId={p.avatarId}
                  seatIndex={p.seatIndex ?? idx}
                  size={40}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {p.username}
                </Text>
              </View>
              <Text style={[styles.total, trophy && { color: trophy.color }]}>{p.totalScore}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderColor: colors.borderStrong,
  },
  heading: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    gap: 8,
  },
  rowFirst: {
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  plainRank: {
    width: 28,
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  name: {
    flex: 1,
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  total: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 24,
    minWidth: 40,
    textAlign: 'right',
  },
});
