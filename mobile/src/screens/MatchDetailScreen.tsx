import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchResultsPanel } from '../components/MatchResultsPanel';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { ScreenTopBar } from '../components/ScreenTopBar';
import { statsApi } from '../services/api';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';

export function MatchDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MatchDetail'>>();
  const insets = useSafeAreaInsets();
  const { matchId } = route.params;

  const q = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const res = await statsApi.matchDetail(matchId);
      return res.data.data as {
        matchId: string;
        roomType: 3 | 4 | 5;
        totalRounds: number;
        playedAt: string;
        userPlacement: number;
        userWon: boolean;
        players: Array<{
          userId: string;
          username: string;
          seatIndex: number;
          totalScore: number;
        }>;
        rounds: Array<{
          roundNumber: number;
          scores: Array<{
            userId: string;
            bid: number;
            tricksWon: number;
            points: number;
          }>;
        }>;
      };
    },
  });

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  const resultsData = useMemo(() => {
    if (!q.data) return null;
    return {
      roomType: q.data.roomType,
      totalRounds: q.data.totalRounds || q.data.rounds.length,
      players: q.data.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        seatIndex: p.seatIndex,
        totalScore: p.totalScore,
      })),
      scoreHistory: q.data.rounds.map((r) => ({
        round: r.roundNumber,
        scores: r.scores,
      })),
    };
  }, [q.data]);

  if (q.isLoading) {
    return (
      <ScreenBackdrop>
        <View style={[styles.center, pad]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenBackdrop>
    );
  }

  if (q.isError || !resultsData) {
    return (
      <ScreenBackdrop>
        <SafeAreaView style={styles.safe} edges={[]}>
          <View style={[styles.root, pad]}>
            <ScreenTopBar title="Match" kicker="History" onBack={() => navigation.goBack()} />
            <Text style={styles.error}>Could not load this match.</Text>
          </View>
        </SafeAreaView>
      </ScreenBackdrop>
    );
  }

  const playedAt = new Date(q.data!.playedAt).toLocaleString();
  const subtitle = `You placed #${q.data!.userPlacement} · ${playedAt}`;

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          <ScreenTopBar title="Match Results" kicker="History" onBack={() => navigation.goBack()} />
          <MatchResultsPanel
            data={resultsData}
            title={`${q.data!.roomType}-Player Table`}
            kicker={subtitle}
          />
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.textMuted, fontFamily: fonts.body, marginTop: spacing.lg },
});
