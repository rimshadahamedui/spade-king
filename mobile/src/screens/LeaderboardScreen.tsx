import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type LeaderEntry = {
  userId: string;
  username: string;
  gamesWon: number;
};

function LeaderRow({
  item,
  index,
  onPress,
}: {
  item: LeaderEntry;
  index: number;
  onPress: () => void;
}) {
  const trophyColor =
    index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, index === 0 && styles.top, pressed && styles.rowPressed]}
    >
      <Text style={[styles.rank, index < 3 && styles.rankHot]}>#{index + 1}</Text>
      <PlayerMiniAvatar username={item.username} seatIndex={index} size={44} />
      <View style={styles.body}>
        <Text style={styles.name}>{item.username}</Text>
        <View style={styles.winsRow}>
          {trophyColor ? <Ionicons name="trophy" size={16} color={trophyColor} /> : null}
          <Text style={styles.wins}>
            {item.gamesWon} {item.gamesWon === 1 ? 'win' : 'wins'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function LeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const q = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await statsApi.leaderboard();
      return res.data.data as LeaderEntry[];
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

  const entries = q.data ?? [];

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <ScreenTopBar
            title="Leaderboard"
            kicker="All games"
            onBack={() => navigation.navigate('Lobby')}
          />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {entries.length === 0 ? (
              <Text style={styles.empty}>The charts are empty — win a match.</Text>
            ) : (
              entries.map((item, index) => (
                <LeaderRow
                  key={item.userId}
                  item={item}
                  index={index}
                  onPress={() =>
                    navigation.navigate('PlayerRecords', {
                      userId: item.userId,
                      username: item.username,
                    })
                  }
                />
              ))
            )}
          </ScrollView>
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
  content: { paddingBottom: 40, gap: 8 },
  empty: { color: colors.textMuted, fontFamily: fonts.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    overflow: 'hidden',
  },
  top: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceInput,
  },
  rowPressed: {
    opacity: 0.85,
    borderColor: colors.borderStrong,
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
