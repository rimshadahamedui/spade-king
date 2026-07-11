import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlayerMiniAvatar } from '../components/PlayerMiniAvatar';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { ScreenTopBar } from '../components/ScreenTopBar';
import { statsApi } from '../services/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function LeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

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
        userId: { username?: string; _id?: string } | string;
      }>;
    },
  });

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  if (q.isLoading) {
    return (
      <ScreenBackdrop>
        <View style={[styles.center, pad]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <ScreenTopBar
            title="Leaderboard"
            kicker="Rankings"
            onBack={() => navigation.navigate('Lobby')}
          />

          <FlatList
            style={styles.flex}
            contentContainerStyle={styles.content}
            data={q.data ?? []}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <Text style={styles.empty}>The charts are empty — win a match.</Text>
            }
            renderItem={({ item, index }) => {
              const name =
                typeof item.userId === 'object' ? item.userId?.username ?? 'Player' : 'Player';
              const trophyColor =
                index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : null;

              return (
                <View style={[styles.row, index === 0 && styles.top]}>
                  <Text style={[styles.rank, index < 3 && styles.rankHot]}>#{index + 1}</Text>
                  <PlayerMiniAvatar username={name} seatIndex={index} size={44} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{name}</Text>
                    <View style={styles.winsRow}>
                      {trophyColor ? (
                        <Ionicons name="trophy" size={16} color={trophyColor} />
                      ) : null}
                      <Text style={styles.wins}>
                        {item.gamesWon} {item.gamesWon === 1 ? 'win' : 'wins'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },
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
    width: 36,
    fontSize: 16,
  },
  rankHot: { color: colors.accentBright },
  body: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  winsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  wins: {
    color: colors.accentBright,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
