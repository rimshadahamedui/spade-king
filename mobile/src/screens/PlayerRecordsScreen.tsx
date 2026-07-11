import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { ScreenTopBar } from '../components/ScreenTopBar';
import { statsApi } from '../services/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

type PlayerGame = {
  matchId: string;
  roomType: number;
  finalScore: number;
  placement: number;
  won: boolean;
  playedAt: string;
};

export function PlayerRecordsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PlayerRecords'>>();
  const insets = useSafeAreaInsets();
  const { userId, username } = route.params;

  const q = useQuery({
    queryKey: ['playerHistory', userId],
    queryFn: async () => {
      const res = await statsApi.playerHistory(userId);
      return res.data.data as {
        userId: string;
        username: string;
        games: PlayerGame[];
      };
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

  const displayName = q.data?.username ?? username;
  const games = q.data?.games ?? [];

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <ScreenTopBar
            title={displayName}
            kicker="Game records"
            onBack={() => navigation.goBack()}
          />

          <FlatList
            style={styles.flex}
            contentContainerStyle={styles.content}
            data={games}
            keyExtractor={(item) => item.matchId}
            ListEmptyComponent={
              <Text style={styles.empty}>No completed games recorded yet.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('MatchDetail', { matchId: item.matchId })}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.roomType}P</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.main}>
                    {item.won ? 'Won' : `Place #${item.placement}`}
                  </Text>
                  <Text style={styles.meta}>{new Date(item.playedAt).toLocaleString()}</Text>
                </View>
                <View style={styles.scoreWrap}>
                  {item.won ? (
                    <Ionicons name="trophy" size={16} color={colors.accentBright} />
                  ) : null}
                  <Text style={[styles.score, item.won && styles.won]}>{item.finalScore}</Text>
                </View>
              </Pressable>
            )}
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
  },
  rowPressed: {
    opacity: 0.85,
    borderColor: colors.borderStrong,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceInput,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  badgeText: { color: colors.accentBright, fontFamily: fonts.bodyBold },
  body: { flex: 1, minWidth: 0 },
  main: { color: colors.text, fontFamily: fonts.bodyBold },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 12, fontFamily: fonts.body },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  score: { color: colors.text, fontSize: 24, fontFamily: fonts.display },
  won: { color: colors.accentBright },
});
