import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlayerMiniAvatar } from '../components/PlayerMiniAvatar';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { ScreenTopBar } from '../components/ScreenTopBar';
import { CATEGORY_LABELS } from '../constants/categories';
import { statsApi } from '../services/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

type LeaderEntry = {
  userId: string;
  username: string;
  gamesWon: number;
};

type LeaderboardByType = Record<'3' | '4' | '5', LeaderEntry[]>;

const ROOM_TYPES: Array<3 | 4 | 5> = [3, 4, 5];

function LeaderRow({ item, index }: { item: LeaderEntry; index: number }) {
  const trophyColor =
    index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : null;

  return (
    <View style={[styles.row, index === 0 && styles.top]}>
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
    </View>
  );
}

function LeaderSection({ roomType, entries }: { roomType: 3 | 4 | 5; entries: LeaderEntry[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{CATEGORY_LABELS[roomType]}</Text>
      {entries.length === 0 ? (
        <Text style={styles.sectionEmpty}>No wins recorded yet.</Text>
      ) : (
        entries.map((item, index) => (
          <LeaderRow key={item.userId} item={item} index={index} />
        ))
      )}
    </View>
  );
}

export function LeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const q = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await statsApi.leaderboard();
      return res.data.data as LeaderboardByType;
    },
  });

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  const hasAny =
    q.data &&
    ROOM_TYPES.some((rt) => (q.data![String(rt) as keyof LeaderboardByType]?.length ?? 0) > 0);

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

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {!hasAny ? (
              <Text style={styles.empty}>The charts are empty — win a match.</Text>
            ) : (
              ROOM_TYPES.map((roomType) => (
                <LeaderSection
                  key={roomType}
                  roomType={roomType}
                  entries={q.data?.[String(roomType) as keyof LeaderboardByType] ?? []}
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
  content: { paddingBottom: 40, gap: spacing.lg },
  empty: { color: colors.textMuted, fontFamily: fonts.body },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionEmpty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
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
