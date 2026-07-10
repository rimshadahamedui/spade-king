import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GamePlayer, PrivateGameSnapshot } from '../models/types';
import { colors, fonts } from '../theme';

type Size = 'compact' | 'large';

interface Props {
  snapshot: PrivateGameSnapshot;
  size?: Size;
  highlightRound?: number;
}

function playerName(player: GamePlayer) {
  return player.username.trim() || 'Player';
}

function formatPts(pts: number | null) {
  if (pts === null) return '·';
  if (pts > 0) return `+${pts}`;
  return String(pts);
}

const METRICS = {
  compact: {
    col: 30,
    name: 76,
    total: 40,
    hdr: 10,
    nameFs: 11,
    ptFs: 10,
    totalFs: 12,
    padV: 4,
    padH: 2,
    rowPad: 5,
  },
  large: {
    col: 34,
    name: 80,
    total: 44,
    hdr: 12,
    nameFs: 13,
    ptFs: 12,
    totalFs: 14,
    padV: 6,
    padH: 4,
    rowPad: 6,
  },
} as const;

export function ScoreGrid({ snapshot, size = 'compact', highlightRound }: Props) {
  const m = METRICS[size];

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

  const rounds = Array.from({ length: snapshot.totalRounds }, (_, i) => i + 1);

  return (
    <View style={{ paddingVertical: m.padV, paddingHorizontal: m.padH }}>
      <View style={[styles.headerRow, { paddingBottom: m.rowPad, marginBottom: m.rowPad }]}>
        <Text style={[styles.cornerCell, { width: m.name }]} />
        {rounds.map((r) => {
          const highlighted = highlightRound === r;
          return (
            <Text
              key={r}
              style={[
                styles.hdrCell,
                { width: m.col, fontSize: m.hdr },
                highlighted && styles.hdrHighlight,
              ]}
            >
              {r}
            </Text>
          );
        })}
        <Text style={[styles.totalHdr, { width: m.total, fontSize: m.hdr + 0.5 }]}>Σ</Text>
      </View>

      {players.map((p) => {
        const byRound = historyMap.get(p.userId);
        return (
          <View
            key={p.userId}
            style={[
              styles.bodyRow,
              size === 'large' && styles.bodyRowLarge,
              { paddingVertical: m.rowPad / 2 },
            ]}
          >
            <Text
              style={[styles.nameCell, { width: m.name, fontSize: m.nameFs }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {playerName(p)}
            </Text>
            {rounds.map((r) => {
              const pts = byRound?.get(r) ?? null;
              const highlighted = highlightRound === r;
              return (
                <Text
                  key={r}
                  style={[
                    styles.ptCell,
                    { width: m.col, fontSize: m.ptFs },
                    highlighted && styles.ptHighlight,
                    pts !== null && pts >= 0 && styles.ptPos,
                    pts !== null && pts < 0 && styles.ptNeg,
                  ]}
                >
                  {formatPts(pts)}
                </Text>
              );
            })}
            <Text style={[styles.totalCell, { width: m.total, fontSize: m.totalFs }]}>
              {p.totalScore}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
    marginBottom: 1,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
  },
  bodyRowLarge: {
    minHeight: 22,
    paddingVertical: 2,
  },
  cornerCell: {},
  hdrCell: {
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
  },
  hdrHighlight: {
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
  },
  totalHdr: {
    textAlign: 'center',
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
  },
  nameCell: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    paddingRight: 6,
  },
  ptCell: {
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    paddingHorizontal: 2,
  },
  ptHighlight: {
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ptPos: { color: colors.emeraldBright },
  ptNeg: { color: colors.danger },
  totalCell: {
    textAlign: 'center',
    color: colors.accentBright,
    fontFamily: fonts.bodyBold,
    paddingLeft: 4,
  },
});
