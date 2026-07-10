import type { Card, Rank, Suit } from '../types';
import { RANK_ORDER, RANKS, ROOM_MODE_CONFIG, SUITS, type RoomModeConfig } from '../constants';
import type { RoomType } from '../types';

export function cardId(suit: Suit, rank: Rank): string {
  return `${rank}${suit}`;
}

export function createCard(suit: Suit, rank: Rank): Card {
  return { suit, rank, id: cardId(suit, rank) };
}

export function parseCardId(id: string): Card {
  const suit = id.slice(-1) as Suit;
  const rank = id.slice(0, -1) as Rank;
  return createCard(suit, rank);
}

export function compareRank(a: Rank, b: Rank): number {
  return RANK_ORDER[a] - RANK_ORDER[b];
}

export function isSameCard(a: Card, b: Card): boolean {
  return a.id === b.id;
}

/**
 * Builds the mode-specific deck (36 / 40 / 50 cards).
 * Single source of truth for card distribution rules.
 */
export class Deck {
  private cards: Card[] = [];

  constructor(private readonly config: RoomModeConfig) {
    this.reset();
  }

  static forRoomType(roomType: RoomType): Deck {
    return new Deck(ROOM_MODE_CONFIG[roomType]);
  }

  reset(): void {
    this.cards = [];
    const removedSet = new Set(
      this.config.removedCards.map((c) => cardId(c.suit, c.rank)),
    );

    for (const suit of SUITS) {
      for (const rank of RANKS) {
        if (this.config.removedRanks.includes(rank)) continue;
        const id = cardId(suit, rank);
        if (removedSet.has(id)) continue;
        this.cards.push(createCard(suit, rank));
      }
    }

    if (this.cards.length !== this.config.totalCards) {
      throw new Error(
        `Deck size mismatch for room type ${this.config.roomType}: expected ${this.config.totalCards}, got ${this.cards.length}`,
      );
    }
  }

  /** Fisher–Yates shuffle (crypto-quality RNG when available). */
  shuffle(rng: () => number = Math.random): this {
    for (let i = this.cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  size(): number {
    return this.cards.length;
  }

  /**
   * Deals equally to N players. Returns hands in seat order.
   */
  deal(playerCount: number): Card[][] {
    if (this.cards.length % playerCount !== 0) {
      throw new Error('Cannot deal uneven deck');
    }
    const perPlayer = this.cards.length / playerCount;
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);

    for (let i = 0; i < this.cards.length; i += 1) {
      hands[i % playerCount].push(this.cards[i]);
    }

    // Sort each hand for deterministic client display (spades first, then H/D/C, high to low)
    for (const hand of hands) {
      hand.sort((a, b) => {
        const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        if (suitOrder !== 0) return suitOrder;
        return compareRank(b.rank, a.rank);
      });
    }

    if (hands.some((h) => h.length !== perPlayer)) {
      throw new Error('Uneven deal');
    }

    return hands;
  }
}
