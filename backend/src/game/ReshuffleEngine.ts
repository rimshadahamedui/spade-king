import { MAX_CONSECUTIVE_RESHUFFLES } from '../constants';
import type { Card } from '../types';
import { RuleEngine, type ReshuffleReason } from './RuleEngine';

export interface ReshuffleDecision {
  shouldReshuffle: boolean;
  reasons: ReshuffleReason[];
  /** Seat indexes of players who qualify for hand-based reshuffle */
  qualifyingSeats: number[];
  rotateShuffler: boolean;
  nextConsecutiveCount: number;
  nextShufflerSeatIndex: number;
}

/**
 * Tracks consecutive reshuffles under the same shuffler and rotates after 3.
 */
export class ReshuffleEngine {
  /**
   * Evaluate hand-based reshuffle eligibility before bidding.
   * A reshuffle is triggered if any player requests and qualifies, OR caller forces (auto).
   */
  static evaluateHands(
    hands: Card[][],
    allSpadesInDeck: Card[],
    shufflerSeatIndex: number,
    consecutiveReshuffles: number,
    playerCount: number,
    requestedBySeats: number[],
  ): ReshuffleDecision {
    const qualifyingSeats: number[] = [];
    const reasons: ReshuffleReason[] = [];

    hands.forEach((hand, seat) => {
      const seatReasons = RuleEngine.getHandReshuffleReasons(hand, allSpadesInDeck);
      if (seatReasons.length > 0) {
        qualifyingSeats.push(seat);
        for (const r of seatReasons) {
          if (!reasons.includes(r)) reasons.push(r);
        }
      }
    });

    const anyQualifiedRequest = requestedBySeats.some((s) => qualifyingSeats.includes(s));
    // Auto-accept path: if ALL qualifying seats requested (or host forced), still need a request
    const shouldReshuffle = anyQualifiedRequest;

    return this.buildDecision(
      shouldReshuffle,
      reasons,
      qualifyingSeats,
      shufflerSeatIndex,
      consecutiveReshuffles,
      playerCount,
    );
  }

  /** After bidding — if total bid < min, force reshuffle (rule 4). */
  static evaluateBidTotal(
    bids: number[],
    minTotal: number,
    shufflerSeatIndex: number,
    consecutiveReshuffles: number,
    playerCount: number,
  ): ReshuffleDecision {
    const valid = RuleEngine.isBidTotalValid(bids, minTotal);
    return this.buildDecision(
      !valid,
      valid ? [] : ['BID_TOTAL_BELOW_MIN'],
      [],
      shufflerSeatIndex,
      consecutiveReshuffles,
      playerCount,
    );
  }

  private static buildDecision(
    shouldReshuffle: boolean,
    reasons: ReshuffleReason[],
    qualifyingSeats: number[],
    shufflerSeatIndex: number,
    consecutiveReshuffles: number,
    playerCount: number,
  ): ReshuffleDecision {
    if (!shouldReshuffle) {
      return {
        shouldReshuffle: false,
        reasons: [],
        qualifyingSeats,
        rotateShuffler: false,
        nextConsecutiveCount: 0,
        nextShufflerSeatIndex: shufflerSeatIndex,
      };
    }

    const nextCount = consecutiveReshuffles + 1;
    const rotate = nextCount >= MAX_CONSECUTIVE_RESHUFFLES;

    return {
      shouldReshuffle: true,
      reasons,
      qualifyingSeats,
      rotateShuffler: rotate,
      nextConsecutiveCount: rotate ? 0 : nextCount,
      nextShufflerSeatIndex: rotate
        ? (shufflerSeatIndex + 1) % playerCount
        : shufflerSeatIndex,
    };
  }
}
