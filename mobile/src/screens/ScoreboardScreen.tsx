import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { MatchResultsPanel } from '../components/MatchResultsPanel';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

export function ScoreboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const snapshot = useGameStore((s) => s.snapshot);
  const room = useGameStore((s) => s.room);
  const insets = useSafeAreaInsets();

  const finished = snapshot?.phase === 'finished' || room?.phase === 'finished';

  const resultsData = useMemo(() => {
    if (!snapshot) return null;
    const players = snapshot.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      seatIndex: p.seatIndex,
      totalScore: p.totalScore,
    }));
    const maxScore = Math.max(...players.map((p) => p.totalScore));
    const winnerIds = players.filter((p) => p.totalScore === maxScore).map((p) => p.userId);
    return {
      roomType: snapshot.roomType,
      totalRounds: snapshot.totalRounds,
      players,
      winnerIds: finished ? winnerIds : undefined,
      scoreHistory: snapshot.scoreHistory ?? [],
    };
  }, [snapshot, finished]);

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  if (!snapshot || !resultsData) {
    return (
      <ScreenBackdrop>
        <SafeAreaView style={styles.safe} edges={[]} />
      </ScreenBackdrop>
    );
  }

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.root, pad]}>
          {finished ? (
            <MatchResultsPanel
              data={resultsData}
              title="Match Over"
              kicker="Final"
              footer={
                <View style={styles.footer}>
                  <Button
                    title="Lounge"
                    onPress={() => {
                      useGameStore.getState().reset();
                      navigation.navigate('Lobby');
                    }}
                  />
                </View>
              }
            />
          ) : (
            <>
              <MatchResultsPanel
                data={resultsData}
                title={`Round ${snapshot.round}`}
                kicker="Round tally"
                highlightRound={snapshot.round}
                footer={
                  <View style={styles.footer}>
                    <Button
                      title="Back to Table"
                      variant="goldOutline"
                      onPress={() => navigation.navigate('Game')}
                    />
                  </View>
                }
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, overflow: 'hidden' },
  footer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
});
