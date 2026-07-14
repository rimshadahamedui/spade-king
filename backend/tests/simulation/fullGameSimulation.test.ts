import { describe, expect, it } from 'vitest';
import { ROOM_MODE_CONFIG } from '../../src/constants';
import { RuleEngine, ScoreEngine } from '../../src/game';
import type { RoomType } from '../../src/types';
import {
  advanceToBidding,
  advanceToPlaying,
  approveScoreboard,
  createEngine,
  firstBidderSeat,
  makePlayers,
  minValidBids,
  placeBidsInOrder,
  playLegalTurn,
  playUntilRoundEnds,
  sequentialRng,
  simulateFullMatch,
} from './simulationHelpers';

const ROOM_TYPES: RoomType[] = [3, 4, 5];

describe('Full match simulation (3 / 4 / 5 player)', () => {
  for (const roomType of ROOM_TYPES) {
    describe(`${roomType}-player mode`, () => {
      for (const seed of [1, 7, 13, 42, 99, 123, 256, 512]) {
        it(`completes match without errors (seed ${seed})`, () => {
          const engine = simulateFullMatch(roomType, seed);
          expect(engine.getPhase()).toBe('finished');
          expect(engine.getRound()).toBeGreaterThanOrEqual(13);
          expect(engine.getRound()).toBe(engine.getTotalRounds());

          const totals = engine.getTotals();
          const scores = Object.values(totals).sort((a, b) => b - a);
          if (scores.length >= 2) {
            expect(scores[0]).not.toBe(scores[1]);
          }

          const players = engine.getPlayers();
          expect(Object.keys(totals)).toHaveLength(roomType);
          for (const p of players) {
            expect(typeof totals[p.userId]).toBe('number');
          }
        });
      }
    });
  }
});

describe('Scenario: low-bid reshuffle recovery', () => {
  for (const roomType of ROOM_TYPES) {
    it(`reshuffles when bids are too low in ${roomType}-player mode, then plays`, () => {
      const engine = createEngine(roomType, 55);
      engine.startGame();
      advanceToBidding(engine);

      const count = roomType;
      const start = firstBidderSeat(engine);
      const lowBid = 1;

      for (let i = 0; i < count; i++) {
        const seat = (start + i) % count;
        engine.placeBid(`u${seat}`, lowBid);
      }

      expect(engine.getPhase()).toBe('reshuffle_check');
      expect(engine.getPublicSnapshot().reshuffleEpoch).toBeGreaterThan(0);

      engine.proceedPastReshuffleCheck();
      expect(engine.getPhase()).toBe('bidding');

      placeBidsInOrder(engine, minValidBids(roomType, count));
      expect(engine.getPhase()).toBe('playing');

      playUntilRoundEnds(engine);
      expect(['scoreboard', 'finished']).toContain(engine.getPhase());
    });
  }
});

describe('Scenario: bidding order and turn rules', () => {
  for (const roomType of ROOM_TYPES) {
    it(`rejects out-of-turn bids in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 3);
      engine.startGame();
      advanceToBidding(engine);

      const first = firstBidderSeat(engine);
      const wrong = (first + 1) % roomType;
      expect(() => engine.placeBid(`u${wrong}`, 2)).toThrow(/turn/i);
    });

    it(`rejects duplicate bids in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 5);
      engine.startGame();
      advanceToBidding(engine);

      const first = firstBidderSeat(engine);
      engine.placeBid(`u${first}`, 2);
      expect(() => engine.placeBid(`u${first}`, 3)).toThrow(/already/i);
    });

    it(`rejects bids outside valid range in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 8);
      engine.startGame();
      advanceToBidding(engine);

      const max = ROOM_MODE_CONFIG[roomType].cardsPerPlayer;
      const first = firstBidderSeat(engine);
      expect(() => engine.placeBid(`u${first}`, 0)).toThrow();
      expect(() => engine.placeBid(`u${first}`, max + 1)).toThrow();
    });
  }
});

describe('Scenario: play rules', () => {
  for (const roomType of ROOM_TYPES) {
    it(`first bidder leads opening trick in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 42);
      engine.startGame();
      advanceToPlaying(engine, roomType);
      expect(engine.getPhase()).toBe('playing');

      const snap = engine.getPublicSnapshot();
      const lead = firstBidderSeat(engine);
      expect(snap.currentTurnSeatIndex).toBe(lead);
      expect(snap.currentTrick?.leadSeatIndex).toBe(lead);
    });

    it(`rejects out-of-turn plays in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 17);
      engine.startGame();
      advanceToPlaying(engine, roomType);
      if (engine.getPhase() !== 'playing') return;

      const turn = engine.getPublicSnapshot().currentTurnSeatIndex!;
      const wrong = (turn + 1) % roomType;
      const hand = engine.getPrivateSnapshot(`u${wrong}`).myHand;
      expect(() => engine.playCard(`u${wrong}`, hand[0].id)).toThrow(/turn/i);
    });

    it(`rejects illegal follow-suit violations in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 21);
      engine.startGame();
      advanceToPlaying(engine, roomType);
      if (engine.getPhase() !== 'playing') return;

      const turn = engine.getPublicSnapshot().currentTurnSeatIndex!;
      const userId = `u${turn}`;
      const hand = engine.getPrivateSnapshot(userId).myHand;
      const lead = engine.getPublicSnapshot().currentTrick?.leadSuit;

      if (!lead) {
        playLegalTurn(engine);
        return;
      }

      const illegal = hand.find((c) => c.suit !== lead && hand.some((h) => h.suit === lead));
      if (!illegal) return;

      expect(() => engine.playCard(userId, illegal.id)).toThrow(/illegal|follow/i);
    });
  }
});

describe('Scenario: scoreboard and round progression', () => {
  for (const roomType of ROOM_TYPES) {
    it(`requires all approvals before next round in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 33);
      engine.startGame();
      advanceToPlaying(engine, roomType);
      playUntilRoundEnds(engine);

      expect(engine.getPhase()).toBe('scoreboard');
      const snap = engine.getPublicSnapshot();
      expect(snap.scores.length).toBe(roomType);

      engine.approveNextRound('u0');
      expect(engine.getPhase()).toBe('scoreboard');

      approveScoreboard(engine);
      expect(engine.getPhase()).toBe('reshuffle_check');
      expect(engine.getRound()).toBe(2);
    });
  }
});

describe('Scenario: deck integrity per round', () => {
  for (const roomType of ROOM_TYPES) {
    it(`deals exactly ${ROOM_MODE_CONFIG[roomType].totalCards} unique cards in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 77);
      engine.startGame();
      advanceToBidding(engine);

      const ids = new Set<string>();
      for (const p of engine.getPublicSnapshot().players) {
        for (const c of engine.getPrivateSnapshot(p.userId).myHand) {
          expect(ids.has(c.id)).toBe(false);
          ids.add(c.id);
        }
      }
      expect(ids.size).toBe(ROOM_MODE_CONFIG[roomType].totalCards);
    });
  }
});

describe('Scenario: early round end when all bids met', () => {
  for (const roomType of ROOM_TYPES) {
    it(`can end round early in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 42);
      engine.startGame();
      advanceToPlaying(engine, roomType);

      const eng = engine as unknown as {
        players: Array<{ bid: number | null; tricksWon: number; hand: unknown[] }>;
        tricksPlayedThisRound: number;
        currentTrick: {
          number: number;
          leadSeatIndex: number;
          leadSuit: string;
          plays: Array<{ userId: string; card: { id: string; suit: string; rank: number }; seatIndex: number }>;
          winnerUserId: string | null;
        };
        resolveTrick: () => void;
      };

      const bids = minValidBids(roomType, roomType);
      eng.players.forEach((p, i) => {
        p.tricksWon = bids[i];
        p.hand = [];
      });
      eng.tricksPlayedThisRound = ROOM_MODE_CONFIG[roomType].cardsPerPlayer - 1;
      eng.currentTrick = {
        number: eng.tricksPlayedThisRound + 1,
        leadSeatIndex: 0,
        leadSuit: 'H',
        plays: Array.from({ length: roomType }, (_, i) => ({
          userId: `u${i}`,
          card: { id: `h${i}`, suit: 'H', rank: 2 + i },
          seatIndex: i,
        })),
        winnerUserId: null,
      };

      eng.resolveTrick();
      expect(engine.getPhase()).toBe('scoreboard');
    });
  }
});

describe('Scenario: reshuffle during bidding (hand qualify)', () => {
  it('finds a seed where bid reshuffle is possible in 3-player mode', () => {
    let found = false;
    for (let seed = 1; seed <= 200; seed += 1) {
      const engine = createEngine(3, seed);
      engine.startGame();
      advanceToBidding(engine);
      if (engine.getPhase() !== 'bidding') continue;

      const snap = engine.getPublicSnapshot();
      const bidder = snap.currentBidderSeatIndex;
      if (bidder === null) continue;

      const userId = `u${bidder}`;
      const privateSnap = engine.getPrivateSnapshot(userId);
      if (!privateSnap.canBidReshuffle) continue;

      const epochBefore = snap.reshuffleEpoch;
      engine.requestBidReshuffle(userId);
      expect(engine.getPublicSnapshot().reshuffleEpoch).toBeGreaterThan(epochBefore);
      expect(engine.getPhase()).toBe('reshuffle_check');
      found = true;
      break;
    }
    expect(found).toBe(true);
  });
});

describe('Scenario: event stream sanity', () => {
  for (const roomType of ROOM_TYPES) {
    it(`emits expected events through one full round in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 44);
      const phases: string[] = [];
      const eventTypes: string[] = [];

      engine.onEvent((e) => {
        eventTypes.push(e.type);
        if (e.type === 'phase') phases.push(e.phase);
      });

      engine.startGame();
      advanceToPlaying(engine, roomType);
      playUntilRoundEnds(engine);

      expect(eventTypes).toContain('shuffle');
      expect(eventTypes).toContain('bidding');
      expect(eventTypes).toContain('playing');
      expect(eventTypes.some((t) => t === 'trickEnd' || t === 'roundScore')).toBe(true);
    });
  }
});

describe('Scenario: deterministic replay', () => {
  for (const roomType of ROOM_TYPES) {
    it(`same seed produces identical totals in ${roomType}-player mode`, () => {
      const a = simulateFullMatch(roomType, 101);
      const b = simulateFullMatch(roomType, 101);
      expect(a.getTotals()).toEqual(b.getTotals());
    });
  }
});

describe('Scenario: illegal actions throw clear errors', () => {
  for (const roomType of ROOM_TYPES) {
    it(`blocks play during bidding in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 2);
      engine.startGame();
      advanceToBidding(engine);
      const hand = engine.getPrivateSnapshot('u0').myHand;
      expect(() => engine.playCard('u0', hand[0]?.id ?? 'XX')).toThrow(/phase/i);
    });

    it(`blocks bid during playing in ${roomType}-player mode`, () => {
      const engine = createEngine(roomType, 2);
      engine.startGame();
      advanceToPlaying(engine, roomType);
      if (engine.getPhase() !== 'playing') return;
      expect(() => engine.placeBid('u0', 2)).toThrow(/phase/i);
    });
  }
});
