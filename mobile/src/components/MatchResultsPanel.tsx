import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScoreRoundsList } from './ScoreRoundsList';
import { WinnersPodium, type WinnerEntry } from './WinnersPodium';
import type { PrivateGameSnapshot } from '../models/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export interface MatchResultsData {
  roomType: 3 | 4 | 5;
  totalRounds: number;
  players: WinnerEntry[];
  scoreHistory: Array<{
    round: number;
    scores: Array<{ userId: string; bid: number; tricksWon: number; points: number }>;
  }>;
}

interface Props {
  data: MatchResultsData;
  title?: string;
  kicker?: string;
  highlightRound?: number;
  footer?: React.ReactNode;
}

function toSnapshot(data: MatchResultsData, highlightRound?: number): PrivateGameSnapshot {
  const players = data.players.map((p, idx) => ({
    userId: p.userId,
    username: p.username,
    seatIndex: p.seatIndex ?? idx,
    handCount: 0,
    bid: null,
    tricksWon: 0,
    totalScore: p.totalScore,
    isConnected: true,
  }));

  return {
    roomId: '',
    roomType: data.roomType,
    phase: 'finished',
    round: highlightRound ?? data.totalRounds,
    totalRounds: data.totalRounds,
    shufflerSeatIndex: 0,
    consecutiveReshuffles: 0,
    currentTurnSeatIndex: null,
    currentBidderSeatIndex: null,
    roundApprovals: [],
    players,
    currentTrick: null,
    lastTrickWinner: null,
    minTotalBid: 0,
    scores: data.scoreHistory[data.scoreHistory.length - 1]?.scores ?? [],
    scoreHistory: data.scoreHistory,
    myHand: [],
    myUserId: '',
  };
}

/** Portrait results: winners on top, vertical scoreboard below. */
export function MatchResultsPanel({
  data,
  title,
  kicker,
  highlightRound,
  footer,
}: Props) {
  const snapshot = useMemo(
    () => toSnapshot(data, highlightRound),
    [data, highlightRound],
  );

  return (
    <View style={styles.root}>
      {(title || kicker) && (
        <View style={styles.header}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <WinnersPodium players={data.players} topCount={3} />

        <View style={styles.scorePanel}>
          <Text style={styles.panelTitle}>Scoreboard</Text>
          <ScoreRoundsList
            snapshot={snapshot}
            highlightRound={highlightRound}
            size="comfortable"
            scrollable={false}
          />
        </View>
      </ScrollView>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: { marginBottom: spacing.sm },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 2,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.cream,
    fontSize: 22,
    fontFamily: fonts.display,
    marginTop: 2,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  scorePanel: {
    width: '100%',
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderColor: colors.borderStrong,
  },
  panelTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
});
