import React, { useMemo, useState } from 'react';
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

type BoardTab = 'monthly' | 'all' | 'high';

type LeaderEntry = {
  userId: string;
  username: string;
  gamesWon: number;
  highScore?: number;
  avatarId?: number | null;
  rank: number;
};

const TABS: Array<{ key: BoardTab; label: string }> = [
  { key: 'monthly', label: 'Monthly Challenge' },
  { key: 'all', label: 'All Time' },
  { key: 'high', label: 'High Scorers' },
];

function trophyColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return colors.accent;
}

function LeaderRow({
  item,
  metric,
  onPress,
}: {
  item: LeaderEntry;
  metric: 'wins' | 'score';
  onPress: () => void;
}) {
  const cupColor = trophyColor(item.rank);
  const value = metric === 'score' ? (item.highScore ?? 0) : item.gamesWon;
  const icon = metric === 'score' ? 'flame' : 'trophy';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        item.rank === 1 && styles.top,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={[styles.rank, item.rank <= 3 && styles.rankHot]}>#{item.rank}</Text>
      <PlayerMiniAvatar
        username={item.username}
        avatarId={item.avatarId}
        seatIndex={item.rank - 1}
        size={44}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.username}
        </Text>
      </View>
      <View style={styles.winsCol}>
        <Ionicons name={icon} size={22} color={cupColor} />
        <Text style={[styles.winsBig, item.rank <= 3 && { color: cupColor }]}>{value}</Text>
      </View>
    </Pressable>
  );
}

export function LeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<BoardTab>('monthly');

  const q = useQuery({
    queryKey: ['leaderboard', tab],
    queryFn: async () => {
      const res = await statsApi.leaderboard(tab);
      return res.data.data as LeaderEntry[];
    },
  });

  const monthLabel = useMemo(() => {
    return new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }, []);

  const kicker =
    tab === 'monthly'
      ? monthLabel
      : tab === 'high'
        ? 'Best single-match scores'
        : 'All games';

  const emptyCopy =
    tab === 'monthly'
      ? 'No wins this month yet — take a table.'
      : tab === 'high'
        ? 'No scores yet — finish a match.'
        : 'The charts are empty — win a match.';

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  const entries = q.data ?? [];

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <ScreenTopBar
            title="Leaderboard"
            kicker={kicker}
            onBack={() => navigation.navigate('Lobby')}
          />

          <View style={styles.tabs}>
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, on && styles.tabOn]}
                >
                  <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={2}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {q.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {entries.length === 0 ? (
                <Text style={styles.empty}>{emptyCopy}</Text>
              ) : (
                entries.map((item) => (
                  <LeaderRow
                    key={item.userId}
                    item={item}
                    metric={tab === 'high' ? 'score' : 'wins'}
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
          )}
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
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
    ...surfaces.chip,
    borderRadius: radii.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tabOn: { backgroundColor: 'rgba(201,162,39,0.2)' },
  tabText: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  tabTextOn: { color: colors.accentBright, fontFamily: fonts.bodyBold },
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
  body: { flex: 1, minWidth: 0, justifyContent: 'center' },
  name: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  winsCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    paddingLeft: 8,
    gap: 2,
  },
  winsBig: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 30,
  },
});
