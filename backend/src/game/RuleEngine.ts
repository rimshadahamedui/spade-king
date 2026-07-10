import type { Card, Suit } from '../types';
import { FACE_RANKS, RANK_ORDER, TRUMP_SUIT } from '../constants';

export type ReshuffleReason =
  | 'NO_SPADES'
  | 'ONLY_LOWEST_SPADE'
  | 'NO_FACE_CARDS'
  | 'BID_TOTAL_BELOW_MIN';

/**
 * Rule Engine — follow-suit, trump, reshuffle eligibility, legal plays.
 * Pure functions / class with no I/O — unit-test friendly.
 */
export class RuleEngine {
  /**
   * Lowest possible spade = the lowest-ranked spade present in the player's hand deck context.
   * Spec: "only the lowest possible Spade" means the player has exactly one spade and it is
   * the globally lowest remaining spade rank for this mode among cards they hold —
   * practically: they hold exactly one Spade which is the lowest Spade in their hand,
   * AND that spade is the lowest spade that exists in the mode deck for this round.
   *
   * Clarified implementation: player has exactly ONE spade, and it is the lowest-rank
   * spade that was dealt into the game (i.e. among all cards in play, that rank is the
   * min spade). We approximate mode-aware by checking against the full hand mode's
   * possible lowest spade from the deck given to us.
   */
  static hasNoSpades(hand: Card[]): boolean {
    return !hand.some((c) => c.suit === TRUMP_SUIT);
  }

  static hasOnlyLowestPossibleSpade(hand: Card[], allSpadesInDeck: Card[]): boolean {
    const spades = hand.filter((c) => c.suit === TRUMP_SUIT);
    if (spades.length !== 1) return false;
    if (allSpadesInDeck.length === 0) return false;

    const lowestInDeck = allSpadesInDeck.reduce((min, c) =>
      RANK_ORDER[c.rank] < RANK_ORDER[min.rank] ? c : min,
    );
    return spades[0].rank === lowestInDeck.rank;
  }

  static hasNoFaceCards(hand: Card[]): boolean {
    return !hand.some((c) => FACE_RANKS.includes(c.rank));
  }

  /**
   * Returns qualifying reasons for a player-requested reshuffle (rules 1–3).
   * Rule 4 (bid total) is evaluated separately after bidding.
   */
  static getHandReshuffleReasons(hand: Card[], allSpadesInDeck: Card[]): ReshuffleReason[] {
    const reasons: ReshuffleReason[] = [];
    if (this.hasNoSpades(hand)) reasons.push('NO_SPADES');
    if (this.hasOnlyLowestPossibleSpade(hand, allSpadesInDeck)) reasons.push('ONLY_LOWEST_SPADE');
    if (this.hasNoFaceCards(hand)) reasons.push('NO_FACE_CARDS');
    return reasons;
  }

  static canPlayerRequestReshuffle(hand: Card[], allSpadesInDeck: Card[]): boolean {
    return this.getHandReshuffleReasons(hand, allSpadesInDeck).length > 0;
  }

  static isBidTotalValid(bids: number[], minTotal: number): boolean {
    const total = bids.reduce((sum, b) => sum + b, 0);
    return total >= minTotal;
  }

  /**
   * Legal cards for current trick: must follow lead suit if possible;
   * otherwise any card. Spades may be played when void in lead suit (or when leading).
   */
  static getLegalPlays(hand: Card[], leadSuit: Suit | null): Card[] {
    if (!leadSuit) return [...hand];
    const following = hand.filter((c) => c.suit === leadSuit);
    if (following.length > 0) return following;
    return [...hand];
  }

  static isLegalPlay(hand: Card[], card: Card, leadSuit: Suit | null): boolean {
    if (!hand.some((c) => c.id === card.id)) return false;
    return this.getLegalPlays(hand, leadSuit).some((c) => c.id === card.id);
  }

  /**
   * Trick winner: highest trump if any trump played; else highest of lead suit.
   */
  static determineTrickWinner(
    plays: Array<{ userId: string; card: Card }>,
    leadSuit: Suit,
  ): string {
    if (plays.length === 0) throw new Error('No plays in trick');

    const trumps = plays.filter((p) => p.card.suit === TRUMP_SUIT);
    const contenders = trumps.length > 0 ? trumps : plays.filter((p) => p.card.suit === leadSuit);

    let winner = contenders[0];
    for (let i = 1; i < contenders.length; i += 1) {
      if (RANK_ORDER[contenders[i].card.rank] > RANK_ORDER[winner.card.rank]) {
        winner = contenders[i];
      }
    }
    return winner.userId;
  }
}
