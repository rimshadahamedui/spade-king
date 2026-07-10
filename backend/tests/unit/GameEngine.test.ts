import { describe, expect, it } from 'vitest';
import { GameEngine } from '../../src/game';

function makePlayers(n: 3 | 4 | 5) {
  return Array.from({ length: n }, (_, i) => ({
    userId: `u${i}`,
    username: `Player${i}`,
    seatIndex: i,
  }));
}

/** Deterministic RNG cycle for reproducible deals in tests. */
function sequentialRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function placeAllBids(engine: GameEngine, bid: number) {
  const snap = engine.getPublicSnapshot();
  const count = snap.players.length;
  const start = (snap.shufflerSeatIndex + 1) % count;
  for (let i = 0; i < count; i++) {
    const seat = (start + i) % count;
    engine.placeBid(`u${seat}`, bid);
  }
}

describe('GameEngine', () => {
  it('runs a full 3-player round through bids and plays without crashing', () => {
    const engine = new GameEngine({
      roomId: 'r1',
      roomType: 3,
      players: makePlayers(3),
      rng: sequentialRng(42),
    });

    engine.startGame();
    expect(engine.getRound()).toBe(1);

    // Skip reshuffle
    if (engine.getPhase() === 'reshuffle_check') {
      engine.proceedPastReshuffleCheck();
    }

    // Keep reshuffling bid failures until we can play — force high enough bids
    let guard = 0;
    while (engine.getPhase() === 'bidding' || engine.getPhase() === 'reshuffle_check' || engine.getPhase() === 'dealing') {
      guard += 1;
      if (guard > 50) throw new Error('stuck');
      if (engine.getPhase() === 'reshuffle_check') {
        engine.proceedPastReshuffleCheck();
      }
      if (engine.getPhase() === 'bidding') {
        placeAllBids(engine, 4);
      }
    }

    expect(engine.getPhase()).toBe('playing');

    // Play all 12 tricks * 3 cards
    let safety = 0;
    while (engine.getPhase() === 'playing' || engine.getPhase() === 'trick_end') {
      safety += 1;
      if (safety > 500) throw new Error('play stuck');
      const snap = engine.getPublicSnapshot();
      if (snap.currentTurnSeatIndex === null) break;
      const turnUser = `u${snap.currentTurnSeatIndex}`;
      const privateSnap = engine.getPrivateSnapshot(turnUser);
      const lead = privateSnap.currentTrick?.leadSuit ?? null;
      const card = privateSnap.myHand.find((c) => !lead || c.suit === lead) ?? privateSnap.myHand[0];
      if (!card) break;
      engine.playCard(turnUser, card.id);
    }

    expect(['scoreboard', 'finished', 'playing']).toContain(engine.getPhase());
  });

  it('rejects out-of-turn plays', () => {
    const engine = new GameEngine({
      roomId: 'r2',
      roomType: 3,
      players: makePlayers(3),
      rng: sequentialRng(7),
    });
    engine.startGame();
    engine.proceedPastReshuffleCheck();
    if (engine.getPhase() === 'bidding') {
      placeAllBids(engine, 3);
    }
    // May reshuffle; advance until playing
    let g = 0;
    while (engine.getPhase() !== 'playing' && g < 40) {
      g += 1;
      if (engine.getPhase() === 'reshuffle_check') engine.proceedPastReshuffleCheck();
      if (engine.getPhase() === 'bidding') {
        placeAllBids(engine, 3);
      }
    }
    if (engine.getPhase() !== 'playing') return;

    const turn = engine.getPublicSnapshot().currentTurnSeatIndex!;
    const wrong = `u${(turn + 1) % 3}`;
    const hand = engine.getPrivateSnapshot(wrong).myHand;
    expect(() => engine.playCard(wrong, hand[0].id)).toThrow(/turn/i);
  });

  it('does not reshuffle again after one bid following low-bid reshuffle', () => {
    const engine = new GameEngine({
      roomId: 'r4',
      roomType: 3,
      players: makePlayers(3),
      rng: sequentialRng(99),
    });
    engine.startGame();
    engine.proceedPastReshuffleCheck();

    placeAllBids(engine, 1);
    expect(engine.getPhase()).toBe('reshuffle_check');
    const epochAfterLow = engine.getPublicSnapshot().reshuffleEpoch;
    expect(epochAfterLow).toBeGreaterThan(0);

    engine.proceedPastReshuffleCheck();
    expect(engine.getPhase()).toBe('bidding');
    expect(engine.getPublicSnapshot().players.every((p) => p.bid === null)).toBe(true);
    expect(engine.getPublicSnapshot().reshuffleNotice).toBeNull();

    const snap = engine.getPublicSnapshot();
    const firstSeat = (snap.shufflerSeatIndex + 1) % snap.players.length;
    engine.placeBid(`u${firstSeat}`, 1);

    expect(engine.getPhase()).toBe('bidding');
    expect(engine.getPublicSnapshot().reshuffleEpoch).toBe(epochAfterLow);
  });

  it('rejects duplicate bids', () => {
    const engine = new GameEngine({
      roomId: 'r3',
      roomType: 4,
      players: makePlayers(4),
      rng: sequentialRng(3),
    });
    engine.startGame();
    engine.proceedPastReshuffleCheck();
    if (engine.getPhase() !== 'bidding') return;
    const snap = engine.getPublicSnapshot();
    const firstBidder = `u${(snap.shufflerSeatIndex + 1) % snap.players.length}`;
    engine.placeBid(firstBidder, 2);
    expect(() => engine.placeBid(firstBidder, 3)).toThrow(/already/i);
  });

  it('first bidder leads the opening trick', () => {
    const engine = new GameEngine({
      roomId: 'r5',
      roomType: 3,
      players: makePlayers(3),
      rng: sequentialRng(42),
    });
    engine.startGame();
    engine.proceedPastReshuffleCheck();

    let guard = 0;
    while (engine.getPhase() !== 'playing' && guard < 40) {
      guard += 1;
      if (engine.getPhase() === 'reshuffle_check') engine.proceedPastReshuffleCheck();
      if (engine.getPhase() === 'bidding') placeAllBids(engine, 3);
    }

    expect(engine.getPhase()).toBe('playing');
    const snap = engine.getPublicSnapshot();
    const firstBidderSeat = (snap.shufflerSeatIndex + 1) % snap.players.length;
    expect(snap.currentTurnSeatIndex).toBe(firstBidderSeat);
    expect(snap.currentTrick?.leadSeatIndex).toBe(firstBidderSeat);
  });

  it('ends round early when every player has met their bid', () => {
    const engine = new GameEngine({
      roomId: 'r6',
      roomType: 3,
      players: makePlayers(3),
      rng: sequentialRng(42),
    });
    engine.startGame();
    engine.proceedPastReshuffleCheck();
    placeAllBids(engine, 3);

    expect(engine.getPhase()).toBe('playing');

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

    eng.players.forEach((p) => {
      p.tricksWon = 3;
      p.hand = [];
    });
    eng.tricksPlayedThisRound = 8;
    eng.currentTrick = {
      number: 9,
      leadSeatIndex: 0,
      leadSuit: 'hearts',
      plays: [
        { userId: 'u0', card: { id: 'h2', suit: 'hearts', rank: 2 }, seatIndex: 0 },
        { userId: 'u1', card: { id: 'h3', suit: 'hearts', rank: 3 }, seatIndex: 1 },
        { userId: 'u2', card: { id: 'h4', suit: 'hearts', rank: 4 }, seatIndex: 2 },
      ],
      winnerUserId: null,
    };

    eng.resolveTrick();

    expect(engine.getPhase()).toBe('scoreboard');
    const after = engine.getPublicSnapshot();
    expect(after.currentTrick).toBeNull();
    expect(after.players.every((p) => p.handCount === 0)).toBe(true);
  });
});
