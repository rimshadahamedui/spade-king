import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { statsApi } from '../services/api';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function LeaderboardScreen() {
  const q = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await statsApi.leaderboard();
      return res.data.data as Array<{
        _id: string;
        gamesWon: number;
        gamesPlayed: number;
        winPercentage: number;
        highestScore: number;
        userId: { username?: string } | string;
      }>;
    },
  });

  if (q.isLoading) {
    return (
      <ScreenBackdrop>
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.content}
        data={q.data ?? []}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={styles.kicker}>Rankings</Text>
            <Text style={styles.title}>Leaderboard</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>The charts are empty — win a match.</Text>}
        renderItem={({ item, index }) => {
          const name =
            typeof item.userId === 'object' ? item.userId?.username ?? 'Player' : 'Player';
          return (
            <View style={[styles.row, index === 0 && styles.top]}>
              <Text style={[styles.rank, index < 3 && styles.rankHot]}>#{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.meta}>
                  {item.gamesWon}W · {item.gamesPlayed} played · {item.winPercentage}% · high{' '}
                  {item.highestScore}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingTop: 24, paddingBottom: 40 },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.cream,
    fontSize: 32,
    fontFamily: fonts.display,
    marginTop: 4,
  },
  empty: { color: colors.textMuted, fontFamily: fonts.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: 10,
    overflow: 'hidden',
  },
  top: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceInput,
  },
  rank: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    width: 44,
    fontSize: 18,
  },
  rankHot: { color: colors.accentBright },
  name: { color: colors.text, fontFamily: fonts.bodyBold },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: fonts.body,
  },
});
