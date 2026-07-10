import { describe, expect, it } from 'vitest';
import { Deck, BidEngine, ScoreEngine, RuleEngine, ReshuffleEngine, createCard } from '../../src/game';
import { ROOM_MODE_CONFIG } from '../../src/constants';

describe('Deck', () => {
  it('builds 36 cards for 3-player mode', () => {
    const deck = Deck.forRoomType(3);
    expect(deck.size()).toBe(36);
    expect(deck.size()).toBe(ROOM_MODE_CONFIG[3].totalCards);
  });

  it('builds 40 cards for 4-player mode', () => {
    expect(Deck.forRoomType(4).size()).toBe(40);
  });

  it('builds 50 cards for 5-player mode without 2C and 2D', () => {
    const cards = Deck.forRoomType(5).getCards();
    expect(cards).toHaveLength(50);
    expect(cards.find((c) => c.id === '2C')).toBeUndefined();
    expect(cards.find((c) => c.id === '2D')).toBeUndefined();
    expect(cards.find((c) => c.id === '2S')).toBeDefined();
    expect(cards.find((c) => c.id === '2H')).toBeDefined();
  });

  it('deals equal hands', () => {
    const deck = Deck.forRoomType(4).shuffle(() => 0.5);
    const hands = deck.deal(4);
    expect(hands).toHaveLength(4);
    expect(hands.every((h) => h.length === 10)).toBe(true);
  });

  it('deals 12 cards each in 3-player mode', () => {
    const hands = Deck.forRoomType(3).shuffle().deal(3);
    expect(hands.every((h) => h.length === 12)).toBe(true);
  });
});

describe('RuleEngine', () => {
  it('detects no spades', () => {
    const hand = [createCard('H', 'A'), createCard('D', 'K')];
    expect(RuleEngine.hasNoSpades(hand)).toBe(true);
  });

  it('detects no face cards', () => {
    const hand = [createCard('S', '6'), createCard('H', '9')];
    expect(RuleEngine.hasNoFaceCards(hand)).toBe(true);
    expect(RuleEngine.hasNoFaceCards([createCard('S', 'J')])).toBe(false);
  });

  it('requires follow suit when possible', () => {
    const hand = [createCard('H', 'A'), createCard('S', '2'), createCard('D', 'K')];
    const legal = RuleEngine.getLegalPlays(hand, 'H');
    expect(legal).toHaveLength(1);
    expect(legal[0].id).toBe('AH');
  });

  it('allows any card when void in suit', () => {
    const hand = [createCard('S', 'A'), createCard('D', 'K')];
    expect(RuleEngine.getLegalPlays(hand, 'H')).toHaveLength(2);
  });

  it('trump wins over higher lead suit', () => {
    const winner = RuleEngine.determineTrickWinner(
      [
        { userId: 'a', card: createCard('H', 'A') },
        { userId: 'b', card: createCard('S', '2') },
        { userId: 'c', card: createCard('H', 'K') },
      ],
      'H',
    );
    expect(winner).toBe('b');
  });

  it('highest lead suit wins when no trump', () => {
    const winner = RuleEngine.determineTrickWinner(
      [
        { userId: 'a', card: createCard('H', '10') },
        { userId: 'b', card: createCard('H', 'A') },
        { userId: 'c', card: createCard('D', 'K') },
      ],
      'H',
    );
    expect(winner).toBe('b');
  });
});

describe('ReshuffleEngine', () => {
  it('rotates shuffler after 3 consecutive reshuffles', () => {
    const hands = [
      [createCard('H', '6'), createCard('D', '7')], // no spades, no faces
      [createCard('S', 'A'), createCard('H', 'K')],
      [createCard('S', 'K'), createCard('H', 'Q')],
    ];
    const allSpades = [createCard('S', 'A'), createCard('S', 'K'), createCard('S', '2')];

    const d1 = ReshuffleEngine.evaluateHands(hands, allSpades, 0, 2, 3, [0]);
    expect(d1.shouldReshuffle).toBe(true);
    expect(d1.rotateShuffler).toBe(true);
    expect(d1.nextShufflerSeatIndex).toBe(1);
    expect(d1.nextConsecutiveCount).toBe(0);
  });

  it('forces reshuffle when bid total below minimum', () => {
    const d = ReshuffleEngine.evaluateBidTotal([1, 2, 3], 9, 0, 0, 3);
    expect(d.shouldReshuffle).toBe(true);
    expect(d.reasons).toContain('BID_TOTAL_BELOW_MIN');
  });

  it('allows play when bid total meets minimum for 3 players', () => {
    const d = ReshuffleEngine.evaluateBidTotal([3, 3, 3], 9, 0, 1, 3);
    expect(d.shouldReshuffle).toBe(false);
    expect(d.nextConsecutiveCount).toBe(0);
  });

  it('allows play when bid total >= 8 for 4 players', () => {
    const d = ReshuffleEngine.evaluateBidTotal([3, 3, 2], 8, 0, 1, 3);
    expect(d.shouldReshuffle).toBe(false);
    expect(d.nextConsecutiveCount).toBe(0);
  });
});

describe('BidEngine', () => {
  it('validates bid range per mode', () => {
    expect(BidEngine.validateBid(10, 4).ok).toBe(true);
    expect(BidEngine.validateBid(11, 4).ok).toBe(false);
    expect(BidEngine.validateBid(12, 3).ok).toBe(true);
    expect(BidEngine.validateBid(0, 4).ok).toBe(false);
    expect(BidEngine.validateBid(-1, 3).ok).toBe(false);
  });

  it('sums bids', () => {
    expect(BidEngine.totalBids([2, 3, 4])).toBe(9);
    expect(BidEngine.meetsMinimum([2, 2, 3], 8)).toBe(false);
  });
});

describe('ScoreEngine', () => {
  it('awards +bid×10 when made (extras do not count)', () => {
    expect(ScoreEngine.scoreRound(4, 4)).toBe(40);
    expect(ScoreEngine.scoreRound(4, 6)).toBe(40);
  });

  it('awards -bid×10 when set', () => {
    expect(ScoreEngine.scoreRound(4, 3)).toBe(-40);
    expect(ScoreEngine.scoreRound(5, 0)).toBe(-50);
  });

  it('computes winners with ties', () => {
    const totals = new Map([
      ['a', 40],
      ['b', 40],
      ['c', 10],
    ]);
    expect(ScoreEngine.determineWinners(totals).sort()).toEqual(['a', 'b']);
  });
});
