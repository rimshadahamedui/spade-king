import { expect } from 'vitest';
import type { RoomType } from '../../src/types';
import { ROOM_MODE_CONFIG } from '../../src/constants';
import { GameEngine, RuleEngine } from '../../src/game';

export function makePlayers(n: 3 | 4 | 5) {
  return Array.from({ length: n }, (_, i) => ({
    userId: `u${i}`,
    username: `Player${i}`,
    seatIndex: i,
  }));
}

/** Deterministic RNG for reproducible deals. */
export function sequentialRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function minValidBids(roomType: RoomType, playerCount: number): number[] {
  const minTotal = ROOM_MODE_CONFIG[roomType].minTotalBid;
  const maxBid = ROOM_MODE_CONFIG[roomType].cardsPerPlayer;
  const base = Math.floor(minTotal / playerCount);
  const bids = Array(playerCount).fill(base);
  let sum = base * playerCount;
  let i = 0;
  while (sum < minTotal) {
    if (bids[i % playerCount] < maxBid) {
      bids[i % playerCount] += 1;
      sum += 1;
    }
    i += 1;
    if (i > 100) throw new Error('Could not distribute valid bids');
  }
  return bids;
}

export function firstBidderSeat(engine: GameEngine): number {
  const snap = engine.getPublicSnapshot();
  return (snap.shufflerSeatIndex + 1) % snap.players.length;
}

export function placeBidsInOrder(engine: GameEngine, bids: number[]): void {
  const snap = engine.getPublicSnapshot();
  const count = snap.players.length;
  const start = firstBidderSeat(engine);
  for (let i = 0; i < count; i++) {
    const seat = (start + i) % count;
    engine.placeBid(`u${seat}`, bids[i]);
  }
}

export function advanceToBidding(engine: GameEngine, maxSteps = 30): void {
  let steps = 0;
  while (
    (engine.getPhase() === 'reshuffle_check' ||
      engine.getPhase() === 'dealing' ||
      engine.getPhase() === 'countdown') &&
    steps < maxSteps
  ) {
    steps += 1;
    if (engine.getPhase() === 'reshuffle_check') {
      engine.proceedPastReshuffleCheck();
    }
  }
  if (steps >= maxSteps) {
    throw new Error(`advanceToBidding stuck in ${engine.getPhase()}`);
  }
}

export function advanceToPlaying(engine: GameEngine, roomType: RoomType, maxSteps = 80): void {
  let steps = 0;
  while (
    engine.getPhase() !== 'playing' &&
    engine.getPhase() !== 'scoreboard' &&
    engine.getPhase() !== 'finished' &&
    steps < maxSteps
  ) {
    steps += 1;
    const phase = engine.getPhase();
    if (phase === 'reshuffle_check') {
      engine.proceedPastReshuffleCheck();
      continue;
    }
    if (phase === 'bidding') {
      const snap = engine.getPublicSnapshot();
      placeBidsInOrder(engine, minValidBids(roomType, snap.players.length));
      continue;
    }
    if (phase === 'dealing') continue;
    throw new Error(`advanceToPlaying unexpected phase ${phase}`);
  }
  if (steps >= maxSteps) {
    throw new Error(`advanceToPlaying stuck in ${engine.getPhase()}`);
  }
}

export function playLegalTurn(engine: GameEngine): boolean {
  const snap = engine.getPublicSnapshot();
  if (snap.phase !== 'playing' || snap.currentTurnSeatIndex === null) return false;

  const userId = `u${snap.currentTurnSeatIndex}`;
  const privateSnap = engine.getPrivateSnapshot(userId);
  const lead = privateSnap.currentTrick?.leadSuit ?? null;
  const legal = RuleEngine.getLegalPlays(privateSnap.myHand, lead);
  if (legal.length === 0) {
    throw new Error(`No legal plays for ${userId} with hand ${privateSnap.myHand.map((c) => c.id).join(',')}`);
  }
  engine.playCard(userId, legal[0].id);
  return true;
}

export function playUntilRoundEnds(engine: GameEngine, maxPlays = 600): void {
  let plays = 0;
  while (engine.getPhase() === 'playing' || engine.getPhase() === 'trick_end') {
    plays += 1;
    if (plays > maxPlays) {
      throw new Error(`playUntilRoundEnds exceeded ${maxPlays} plays in phase ${engine.getPhase()}`);
    }
    if (engine.getPhase() === 'playing') {
      if (!playLegalTurn(engine)) break;
    }
  }
}

export function approveScoreboard(engine: GameEngine): void {
  const snap = engine.getPublicSnapshot();
  for (const p of snap.players) {
    engine.approveNextRound(p.userId);
  }
}

export function assertSnapshotInvariants(engine: GameEngine): void {
  const snap = engine.getPublicSnapshot();
  const seen = new Set<string>();

  for (const p of snap.players) {
    expect(p.handCount).toBeGreaterThanOrEqual(0);
    expect(p.bid === null || (p.bid >= 1 && p.bid <= ROOM_MODE_CONFIG[snap.roomType].cardsPerPlayer)).toBe(
      true,
    );
    const hand = engine.getPrivateSnapshot(p.userId).myHand;
    for (const c of hand) {
      if (seen.has(c.id)) throw new Error(`Duplicate card in play: ${c.id}`);
      seen.add(c.id);
    }
  }

  if (snap.currentTrick) {
    for (const play of snap.currentTrick.plays) {
      if (seen.has(play.card.id)) throw new Error(`Duplicate card in trick: ${play.card.id}`);
      seen.add(play.card.id);
    }
  }

  expect(snap.round).toBeGreaterThanOrEqual(0);
  expect(snap.round).toBeLessThanOrEqual(snap.totalRounds);
}

export function createEngine(roomType: RoomType, seed: number): GameEngine {
  return new GameEngine({
    roomId: `sim-${roomType}-${seed}`,
    roomType,
    players: makePlayers(roomType),
    rng: sequentialRng(seed),
  });
}

export function simulateFullMatch(roomType: RoomType, seed: number): GameEngine {
  const engine = createEngine(roomType, seed);
  const errors: string[] = [];

  engine.onEvent(() => {
    try {
      assertSnapshotInvariants(engine);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  });

  engine.startGame();

  let roundGuard = 0;
  while (engine.getPhase() !== 'finished' && roundGuard < 20) {
    roundGuard += 1;

    advanceToBidding(engine);
    if (engine.getPhase() === 'finished') break;

    advanceToPlaying(engine, roomType);
    if (engine.getPhase() === 'scoreboard' || engine.getPhase() === 'finished') {
      if (engine.getPhase() === 'scoreboard') approveScoreboard(engine);
      continue;
    }

    if (engine.getPhase() !== 'playing') {
      throw new Error(`Expected playing, got ${engine.getPhase()} (seed ${seed}, round ${engine.getRound()})`);
    }

    playUntilRoundEnds(engine);

    if (engine.getPhase() === 'scoreboard') {
      approveScoreboard(engine);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invariant violations: ${errors.join('; ')}`);
  }

  if (engine.getPhase() !== 'finished') {
    throw new Error(`Match did not finish (phase ${engine.getPhase()}, round ${engine.getRound()})`);
  }

  return engine;
}
