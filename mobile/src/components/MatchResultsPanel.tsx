import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ScoreGrid } from './ScoreGrid';
import { WinnersPodium, type WinnerEntry } from './WinnersPodium';
import type { PrivateGameSnapshot } from '../models/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export interface MatchResultsData {
  roomType: 3 | 4 | 5;
  totalRounds: number;
  players: WinnerEntry[];
  winnerIds?: string[];
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
  /** Show bid · tricks per round in scoreboard (default true for results) */
  showBidTake?: boolean;
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

export function MatchResultsPanel({
  data,
  title,
  kicker,
  highlightRound,
  showBidTake = true,
  footer,
}: Props) {
  const { width } = useWindowDimensions();
  const stacked = width < 640;
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

      <View style={[styles.split, stacked && styles.splitStacked]}>
        <View style={[styles.scorePanel, stacked && styles.scorePanelStacked]}>
          <Text style={styles.panelTitle}>Scoreboard</Text>
          {showBidTake ? (
            <Text style={styles.panelHint}>Bid · tricks (points per round)</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
            <ScoreGrid
              snapshot={snapshot}
              size="large"
              highlightRound={highlightRound}
              showBidTake={showBidTake}
            />
          </ScrollView>
        </View>

        <View style={[styles.winnersWrap, stacked && styles.winnersWrapStacked]}>
          <WinnersPodium players={data.players} winnerIds={data.winnerIds} />
        </View>
      </View>

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
    fontSize: 24,
    fontFamily: fonts.display,
    marginTop: 2,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 0,
  },
  splitStacked: {
    flexDirection: 'column',
  },
  scorePanel: {
    flex: 1.4,
    minWidth: 0,
    ...surfaces.panel,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderColor: colors.borderStrong,
  },
  scorePanelStacked: {
    flex: 0,
    maxHeight: 280,
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
  panelHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 9,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  winnersWrap: {
    flex: 1,
    minWidth: 180,
    minHeight: 0,
  },
  winnersWrapStacked: {
    flex: 1,
    minHeight: 180,
  },
});
