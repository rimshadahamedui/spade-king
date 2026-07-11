import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GamePlayer, PrivateGameSnapshot } from '../models/types';
import { colors, fonts, spacing } from '../theme';

type Size = 'compact' | 'comfortable';

interface Props {
  snapshot: PrivateGameSnapshot;
  /** Only show rounds that have been played */
  playedOnly?: boolean;
  maxHeight?: number;
  /** When false, render full list without inner scroll (for parent ScrollView) */
  scrollable?: boolean;
  highlightRound?: number;
  size?: Size;
}

function playerName(player: GamePlayer) {
  return player.username.trim() || 'Player';
}

function formatPts(pts: number | null) {
  if (pts === null) return '·';
  return String(pts);
}

const METRICS = {
  compact: {
    roundCol: 26,
    roundFs: 10,
    nameFs: 9,
    ptFs: 10,
    totalLabelFs: 10,
    totalFs: 14,
    rowH: 22,
    totalRowH: 28,
  },
  comfortable: {
    roundCol: 30,
    roundFs: 11,
    nameFs: 10,
    ptFs: 12,
    totalLabelFs: 11,
    totalFs: 17,
    rowH: 24,
    totalRowH: 32,
  },
} as const;

function ThinLine({ width }: { width: number }) {
  return <View style={[styles.divider, { width }]} />;
}

export function ScoreRoundsList({
  snapshot,
  playedOnly = true,
  maxHeight,
  scrollable = true,
  highlightRound,
  size = 'compact',
}: Props) {
  const m = METRICS[size];
  const { height: deviceHeight } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const resolvedMaxHeight = maxHeight || deviceHeight * 0.6;

  const players = useMemo(
    () => [...snapshot.players].sort((a, b) => a.seatIndex - b.seatIndex),
    [snapshot.players],
  );

  const historyMap = useMemo(() => {
    const map = new Map<string, Map<number, number>>();
    for (const entry of snapshot.scoreHistory ?? []) {
      for (const s of entry.scores) {
        if (!map.has(s.userId)) map.set(s.userId, new Map());
        map.get(s.userId)!.set(entry.round, s.points);
      }
    }
    return map;
  }, [snapshot.scoreHistory]);

  const rounds = useMemo(() => {
    const all = Array.from({ length: snapshot.totalRounds }, (_, i) => i + 1);
    if (!playedOnly) return all;
    const played = new Set<number>();
    for (const entry of snapshot.scoreHistory ?? []) {
      played.add(entry.round);
    }
    if (played.size === 0 && snapshot.round > 0) {
      return all.filter((r) => r <= snapshot.round);
    }
    return all.filter((r) => played.has(r));
  }, [snapshot.totalRounds, snapshot.scoreHistory, snapshot.round, playedOnly]);

  const tableWidth = availableWidth;
  const playerColWidth =
    players.length > 0 ? Math.max(0, (tableWidth - m.roundCol) / players.length) : 0;

  const measureWidth = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next > 0 && next !== availableWidth) setAvailableWidth(next);
  };

  if (rounds.length === 0) {
    return <Text style={styles.empty}>No rounds played yet.</Text>;
  }

  const body = tableWidth > 0 ? (
    <View style={{ width: tableWidth }}>
      <View style={styles.headerRow}>
        <View style={{ width: m.roundCol }} />
        {players.map((p) => (
          <Text
            key={p.userId}
            style={[styles.nameCell, { width: playerColWidth, fontSize: m.nameFs }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {playerName(p)}
          </Text>
        ))}
      </View>

      {rounds.map((roundNum) => {
        const highlighted = (highlightRound ?? snapshot.round) === roundNum;

        return (
          <View key={roundNum} style={[styles.dataRow, { minHeight: m.rowH }]}>
            <Text
              style={[
                styles.roundLabel,
                { width: m.roundCol, fontSize: m.roundFs },
                highlighted && styles.roundLabelActive,
              ]}
            >
              R{roundNum}
            </Text>
            {players.map((p) => {
              const pts = historyMap.get(p.userId)?.get(roundNum) ?? null;
              return (
                <Text
                  key={p.userId}
                  style={[
                    styles.ptCell,
                    { width: playerColWidth, fontSize: m.ptFs },
                    highlighted && styles.ptHighlight,
                    pts !== null && pts >= 0 && styles.ptPos,
                    pts !== null && pts < 0 && styles.ptNeg,
                  ]}
                >
                  {formatPts(pts)}
                </Text>
              );
            })}
          </View>
        );
      })}

      <ThinLine width={tableWidth} />

      <View style={[styles.dataRow, styles.totalRow, { minHeight: m.totalRowH }]}>
        <Text
          style={[
            styles.totalLabel,
            { width: m.roundCol, fontSize: m.totalLabelFs },
          ]}
        >
          Total
        </Text>
        {players.map((p) => {
          const total = p.totalScore;
          return (
            <Text
              key={p.userId}
              style={[
                styles.grandTotalCell,
                { width: playerColWidth, fontSize: m.totalFs },
                total >= 0 && styles.ptPos,
                total < 0 && styles.ptNeg,
              ]}
            >
              {formatPts(total)}
            </Text>
          );
        })}
      </View>
    </View>
  ) : null;

  const wrapped = scrollable ? (
    <ScrollView
      style={[styles.fullWidth, { maxHeight: resolvedMaxHeight }]}
      contentContainerStyle={[styles.scrollContent, styles.fullWidth]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      onLayout={measureWidth}
    >
      {body}
    </ScrollView>
  ) : (
    <View style={styles.fullWidth} onLayout={measureWidth}>
      {body}
    </View>
  );

  return wrapped;
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  scrollContent: {
    paddingBottom: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 4,
    paddingBottom: 2,
  },
  nameCell: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    textAlign: 'center',
    paddingHorizontal: 2,
    minHeight: 24,
    textAlignVertical: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    textAlign: 'left',
    paddingRight: 2,
  },
  roundLabelActive: {
    color: colors.accentBright,
  },
  ptCell: {
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    paddingHorizontal: 1,
  },
  totalRow: {
    marginTop: 2,
  },
  totalLabel: {
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
    textAlign: 'left',
    paddingRight: 2,
  },
  grandTotalCell: {
    textAlign: 'center',
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
    paddingHorizontal: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 6,
    alignSelf: 'center',
  },
  ptHighlight: {
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ptPos: { color: colors.emeraldBright },
  ptNeg: { color: colors.danger },
});
