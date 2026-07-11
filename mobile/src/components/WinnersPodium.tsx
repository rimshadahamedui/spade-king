import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerMiniAvatar } from './PlayerMiniAvatar';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export interface WinnerEntry {
  userId: string;
  username: string;
  seatIndex?: number;
  totalScore: number;
}

const TROPHY = {
  gold: { color: '#FFD700', icon: 'trophy' as const },
  silver: { color: '#C0C0C0', icon: 'trophy' as const },
  bronze: { color: '#CD7F32', icon: 'trophy' as const },
};

interface Props {
  players: WinnerEntry[];
  /** When set, only these players appear (match winners). */
  winnerIds?: string[];
}

function resolveWinners(players: WinnerEntry[], winnerIds?: string[]): WinnerEntry[] {
  if (winnerIds?.length) {
    const idSet = new Set(winnerIds);
    return players.filter((p) => idSet.has(p.userId));
  }
  if (!players.length) return [];
  const max = Math.max(...players.map((p) => p.totalScore));
  return players.filter((p) => p.totalScore === max);
}

export function WinnersPodium({ players, winnerIds }: Props) {
  const ranked = [...resolveWinners(players, winnerIds)].sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Winners</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {ranked.map((p, idx) => {
          const topScore = ranked[0]?.totalScore ?? -Infinity;
          const atTop = p.totalScore === topScore;
          const trophy = atTop
            ? TROPHY.gold
            : idx === 1
              ? TROPHY.silver
              : idx === 2
                ? TROPHY.bronze
                : null;

          return (
            <View key={p.userId} style={[styles.row, idx === 0 && styles.rowFirst]}>
              <View style={styles.left}>
                {trophy ? (
                  <Ionicons name={trophy.icon} size={28} color={trophy.color} />
                ) : (
                  <Text style={styles.plainRank}>#{idx + 1}</Text>
                )}
                <PlayerMiniAvatar username={p.username} seatIndex={p.seatIndex ?? idx} size={36} />
                <Text style={styles.name} numberOfLines={1}>
                  {p.username}
                </Text>
              </View>
              <Text style={[styles.total, trophy && { color: trophy.color }]}>{p.totalScore}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 160,
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
  scroll: { flex: 1 },
  list: { gap: 8, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
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
    gap: 8,
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
    fontSize: 14,
  },
  total: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 22,
    minWidth: 36,
    textAlign: 'right',
  },
});
