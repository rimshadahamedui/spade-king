import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function ScoreboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const snapshot = useGameStore((s) => s.snapshot);
  const room = useGameStore((s) => s.room);
  const insets = useSafeAreaInsets();

  const finished = snapshot?.phase === 'finished' || room?.phase === 'finished';
  const players = [...(snapshot?.players ?? [])].sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  const scoreMap = new Map(snapshot?.scores?.map((s) => [s.userId, s]) ?? []);

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>{finished ? 'Final' : 'Round tally'}</Text>
              <Text style={styles.title}>
                {finished ? 'Match Over' : `Round ${snapshot?.round}`}
              </Text>
            </View>
            {finished ? (
              <Button
                title="Lounge"
                onPress={() => {
                  useGameStore.getState().reset();
                  navigation.navigate('Lobby');
                }}
              />
            ) : (
              <Button
                title="Back"
                variant="goldOutline"
                onPress={() => navigation.navigate('Game')}
              />
            )}
          </View>

          <View style={styles.grid}>
            {players.map((p, idx) => {
              const round = scoreMap.get(p.userId);
              const pts = round?.points ?? 0;
              return (
                <View
                  key={p.userId}
                  style={[styles.card, idx === 0 && styles.leader]}
                >
                  <Text style={[styles.rank, idx === 0 && styles.rankGold]}>#{idx + 1}</Text>
                  <View style={styles.cardBody}>
                    <Text style={styles.name} numberOfLines={1}>
                      {p.username}
                    </Text>
                    <Text style={styles.meta}>
                      Bid {round?.bid ?? p.bid ?? '—'} · {round?.tricksWon ?? p.tricksWon}w
                    </Text>
                  </View>
                  <View style={styles.ptsCol}>
                    <Text style={[styles.roundPts, pts >= 0 ? styles.wonPos : styles.wonNeg]}>
                      {pts >= 0 ? `+${pts}` : pts}
                    </Text>
                    <Text style={styles.score}>{p.totalScore}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
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
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignContent: 'flex-start',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    flexGrow: 1,
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 8,
    minWidth: 200,
  },
  leader: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceInput,
  },
  rank: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    width: 28,
    fontSize: 14,
  },
  rankGold: { color: colors.accentBright },
  cardBody: { flex: 1, minWidth: 0 },
  name: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  ptsCol: { alignItems: 'flex-end' },
  roundPts: {
    fontFamily: fonts.display,
    fontSize: 20,
  },
  wonPos: { color: colors.emeraldBright },
  wonNeg: { color: colors.danger },
  score: {
    color: colors.accentBright,
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    marginTop: 2,
  },
});
