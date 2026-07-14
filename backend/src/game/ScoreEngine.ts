import type { RoundScore } from '../types';

/**
 * Score Engine — custom individual scoring only.
 *
 * Made bid  → +bid × 10 (extra tricks beyond bid award nothing)
 * Missed bid → -bid × 10
 */
export class ScoreEngine {
  static scoreRound(bid: number, tricksWon: number): number {
    const points = bid * 10;
    if (tricksWon >= bid) return points;
    return -points;
  }

  static computeRoundScores(
    entries: Array<{ userId: string; bid: number; tricksWon: number }>,
  ): RoundScore[] {
    return entries.map((e) => ({
      userId: e.userId,
      bid: e.bid,
      tricksWon: e.tricksWon,
      points: this.scoreRound(e.bid, e.tricksWon),
    }));
  }

  static applyToTotals(
    totals: Map<string, number>,
    roundScores: RoundScore[],
  ): Map<string, number> {
    const next = new Map(totals);
    for (const s of roundScores) {
      next.set(s.userId, (next.get(s.userId) ?? 0) + s.points);
    }
    return next;
  }

  static determineWinners(totals: Map<string, number>): string[] {
    let max = -Infinity;
    for (const score of totals.values()) {
      if (score > max) max = score;
    }
    return [...totals.entries()].filter(([, s]) => s === max).map(([id]) => id);
  }

  /** True when 1st and 2nd place share the same total — triggers an extra round. */
  static isTopTwoTied(totals: Map<string, number>): boolean {
    const scores = [...totals.values()].sort((a, b) => b - a);
    if (scores.length < 2) return false;
    return scores[0] === scores[1];
  }
}
