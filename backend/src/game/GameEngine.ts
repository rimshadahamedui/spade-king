import {
  ROOM_MODE_CONFIG,
  TOTAL_ROUNDS,
  TRUMP_SUIT,
} from '../constants';
import type {
  Card,
  GamePlayerState,
  PrivateGameSnapshot,
  PublicGamePlayerState,
  RoomPhase,
  RoomType,
  RoundScore,
  Suit,
  TrickPlay,
  TrickState,
} from '../types';
import { BidEngine } from './BidEngine';
import { Deck } from './Deck';
import { ReshuffleEngine, type ReshuffleDecision } from './ReshuffleEngine';
import { RuleEngine, type ReshuffleReason } from './RuleEngine';
import { buildBidTotalReshuffleDisplay, buildReshuffleDisplay } from './reshuffleLabels';
import { ScoreEngine } from './ScoreEngine';

export type GameEvent =
  | { type: 'phase'; phase: RoomPhase }
  | { type: 'shuffle'; round: number }
  | { type: 'dealt'; handsPrivate: true }
  | {
      type: 'reshuffle';
      reasons: string[];
      shufflerSeatIndex: number;
      consecutive: number;
      epoch: number;
      username?: string;
      displayMessage?: string;
    }
  | { type: 'bidding' }
  | { type: 'bid'; userId: string; bid: number }
  | { type: 'playing'; leadSeatIndex: number }
  | { type: 'cardPlayed'; play: TrickPlay }
  | { type: 'trickEnd'; winnerUserId: string; trick: TrickState }
  | { type: 'roundScore'; scores: RoundScore[]; round: number }
  | { type: 'nextRound'; round: number }
  | { type: 'finished'; winners: string[]; totals: Record<string, number> }
  | { type: 'error'; message: string };

export interface GameEngineOptions {
  roomId: string;
  roomType: RoomType;
  players: Array<{ userId: string; username: string; seatIndex: number; avatarId?: number }>;
  /** Initial shuffler seat; defaults to 0 */
  shufflerSeatIndex?: number;
  rng?: () => number;
}

/**
 * Authoritative in-memory game state machine.
 * One instance per active match. Persisted snapshots are handled by MatchService.
 */
export class GameEngine {
  readonly roomId: string;
  readonly roomType: RoomType;
  readonly minTotalBid: number;

  private scheduledTotalRounds = TOTAL_ROUNDS;

  private phase: RoomPhase = 'waiting';
  private round = 0;
  private players: GamePlayerState[] = [];
  private shufflerSeatIndex: number;
  private consecutiveReshuffles = 0;
  private currentTurnSeatIndex: number | null = null;
  private currentTrick: TrickState | null = null;
  private lastTrickWinner: string | null = null;
  private tricksPlayedThisRound = 0;
  private tricksPerRound: number;
  private allSpadesInDeck: Card[] = [];
  private reshuffleRequests = new Set<number>();
  private roundScoresHistory: RoundScore[][] = [];
  private roundApprovals = new Set<string>();
  private currentBidderSeatIndex: number | null = null;
  private scoreboardEndsAt: number | null = null;
  private lastReshuffleNotice: { username: string; message: string } | null = null;
  private reshuffleEpoch = 0;
  private eventListeners: Array<(event: GameEvent) => void> = [];
  private readonly rng: () => number;

  constructor(options: GameEngineOptions) {
    this.roomId = options.roomId;
    this.roomType = options.roomType;
    this.rng = options.rng ?? Math.random;
    this.shufflerSeatIndex = options.shufflerSeatIndex ?? 0;
    this.tricksPerRound = ROOM_MODE_CONFIG[options.roomType].cardsPerPlayer;
    this.minTotalBid = ROOM_MODE_CONFIG[options.roomType].minTotalBid;

    const config = ROOM_MODE_CONFIG[options.roomType];
    if (options.players.length !== config.playerCount) {
      throw new Error(`Expected ${config.playerCount} players, got ${options.players.length}`);
    }

    this.players = options.players
      .slice()
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        seatIndex: p.seatIndex,
        avatarId: p.avatarId,
        hand: [],
        bid: null,
        tricksWon: 0,
        totalScore: 0,
        isConnected: true,
        lastHeartbeatAt: Date.now(),
      }));
  }

  onEvent(listener: (event: GameEvent) => void): void {
    this.eventListeners.push(listener);
  }

  private emit(event: GameEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  getPhase(): RoomPhase {
    return this.phase;
  }

  getRound(): number {
    return this.round;
  }

  getTotalRounds(): number {
    return this.scheduledTotalRounds;
  }

  startGame(): void {
    if (this.phase !== 'waiting' && this.phase !== 'countdown') {
      throw new Error('Game already started');
    }
    this.round = 0;
    this.beginRound();
  }

  /** Starts the next deal cycle (called at game start and after each round). */
  beginRound(): void {
    this.round += 1;
    if (this.round > this.scheduledTotalRounds) {
      this.finishGame();
      return;
    }

    this.players.forEach((p) => {
      p.hand = [];
      p.bid = null;
      p.tricksWon = 0;
    });
    this.currentTrick = null;
    this.tricksPlayedThisRound = 0;
    this.reshuffleRequests.clear();
    this.consecutiveReshuffles = 0;
    this.dealFresh();
  }

  private dealFresh(): void {
    this.setPhase('dealing');
    this.emit({ type: 'shuffle', round: this.round });
    this.emit({ type: 'phase', phase: 'dealing' });

    const deck = Deck.forRoomType(this.roomType);
    deck.shuffle(this.rng);
    this.emit({ type: 'phase', phase: 'dealing' });

    this.allSpadesInDeck = deck.getCards().filter((c) => c.suit === TRUMP_SUIT);
    const hands = deck.deal(this.players.length);

    this.players.forEach((p, i) => {
      p.hand = hands[i];
      p.bid = null;
      p.tricksWon = 0;
    });

    this.emit({ type: 'dealt', handsPrivate: true });
    this.setPhase('reshuffle_check');
    this.emit({ type: 'phase', phase: 'reshuffle_check' });
  }

  /**
   * Player requests reshuffle during reshuffle_check phase.
   * Server validates eligibility; if any valid request exists we reshuffle.
   */
  requestReshuffle(userId: string): void {
    this.assertPhase('reshuffle_check');
    const player = this.requirePlayer(userId);
    const reasons = RuleEngine.getHandReshuffleReasons(player.hand, this.allSpadesInDeck);
    if (reasons.length === 0) {
      throw new Error('You are not eligible to request a reshuffle');
    }
    this.reshuffleRequests.add(player.seatIndex);
    this.tryApplyReshuffle();
  }

  /** Explicit accept / skip reshuffle — if all non-qualifying or all decided, proceed. */
  acceptDeal(userId: string): void {
    this.assertPhase('reshuffle_check');
    const player = this.requirePlayer(userId);
    // Mark as decided by removing pending — use negative presence via "accepted" set
    (player as GamePlayerState & { acceptedDeal?: boolean }).acceptedDeal = true;

    const allResponded = this.players.every((p) => {
      const canAsk = RuleEngine.canPlayerRequestReshuffle(p.hand, this.allSpadesInDeck);
      if (!canAsk) return true;
      return this.reshuffleRequests.has(p.seatIndex) || (p as GamePlayerState & { acceptedDeal?: boolean }).acceptedDeal;
    });

    if (this.reshuffleRequests.size > 0) {
      this.tryApplyReshuffle();
      return;
    }

    if (allResponded) {
      this.startBidding();
    }
  }

  /** Auto-timeout path: if no reshuffle requests after grace, start bidding. */
  proceedPastReshuffleCheck(): void {
    this.assertPhase('reshuffle_check');
    if (this.reshuffleRequests.size > 0) {
      this.tryApplyReshuffle();
      return;
    }
    this.startBidding();
  }

  /**
   * During bidding — current bidder may reshuffle if hand qualifies (rules 1–3).
   */
  requestBidReshuffle(userId: string): void {
    this.assertPhase('bidding');
    const player = this.requirePlayer(userId);
    if (player.seatIndex !== this.currentBidderSeatIndex) {
      throw new Error('Not your turn to bid');
    }

    const handReasons = RuleEngine.getHandReshuffleReasons(player.hand, this.allSpadesInDeck);
    if (handReasons.length === 0) {
      throw new Error('You are not eligible to request a reshuffle');
    }

    const decision = ReshuffleEngine.evaluateHands(
      this.players.map((p) => p.hand),
      this.allSpadesInDeck,
      this.shufflerSeatIndex,
      this.consecutiveReshuffles,
      this.players.length,
      [player.seatIndex],
    );

    if (!decision.shouldReshuffle) {
      throw new Error('Reshuffle could not be applied');
    }

    this.applyReshuffle(decision, { username: player.username, reasons: handReasons });
  }

  private tryApplyReshuffle(): void {
    const hands = this.players.map((p) => p.hand);
    const decision = ReshuffleEngine.evaluateHands(
      hands,
      this.allSpadesInDeck,
      this.shufflerSeatIndex,
      this.consecutiveReshuffles,
      this.players.length,
      [...this.reshuffleRequests],
    );

    if (!decision.shouldReshuffle) return;

    const requesterSeat = [...this.reshuffleRequests][0];
    const requester =
      requesterSeat !== undefined
        ? this.players.find((p) => p.seatIndex === requesterSeat)
        : undefined;
    const handReasons = requester
      ? RuleEngine.getHandReshuffleReasons(requester.hand, this.allSpadesInDeck)
      : [];

    this.applyReshuffle(
      decision,
      requester && handReasons.length > 0
        ? { username: requester.username, reasons: handReasons }
        : undefined,
    );
  }

  private applyReshuffle(
    decision: ReshuffleDecision,
    notice?: { username: string; reasons: ReshuffleReason[] },
  ): void {
    const bidTotalTooLow = decision.reasons.includes('BID_TOTAL_BELOW_MIN');
    const bidTotalBeforeClear = bidTotalTooLow
      ? this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0)
      : 0;

    this.shufflerSeatIndex = decision.nextShufflerSeatIndex;
    this.consecutiveReshuffles = decision.nextConsecutiveCount;
    this.reshuffleRequests.clear();
    this.players.forEach((p) => {
      delete (p as GamePlayerState & { acceptedDeal?: boolean }).acceptedDeal;
      p.bid = null;
    });
    this.currentBidderSeatIndex = null;

    let displayMessage: string | undefined;
    let username: string | undefined;

    if (notice) {
      username = notice.username;
      displayMessage = buildReshuffleDisplay(notice.username, notice.reasons[0]);
    } else if (bidTotalTooLow) {
      username = 'Table';
      displayMessage = buildBidTotalReshuffleDisplay(bidTotalBeforeClear, this.minTotalBid);
    }

    if (displayMessage) {
      this.lastReshuffleNotice = { username: username ?? 'Table', message: displayMessage };
    } else {
      this.lastReshuffleNotice = null;
    }

    this.reshuffleEpoch += 1;

    this.emit({
      type: 'reshuffle',
      reasons: decision.reasons,
      shufflerSeatIndex: this.shufflerSeatIndex,
      consecutive: this.consecutiveReshuffles,
      epoch: this.reshuffleEpoch,
      username,
      displayMessage,
    });

    this.dealFresh();
  }

  private firstBidderSeat(): number {
    return (this.shufflerSeatIndex + 1) % this.players.length;
  }

  private startBidding(): void {
    this.lastReshuffleNotice = null;
    this.players.forEach((p) => {
      p.bid = null;
      p.tricksWon = 0;
    });
    this.currentBidderSeatIndex = this.firstBidderSeat();
    this.setPhase('bidding');
    this.emit({ type: 'bidding' });
  }

  placeBid(userId: string, bid: number): void {
    this.assertPhase('bidding');
    const player = this.requirePlayer(userId);
    if (player.bid !== null) throw new Error('Bid already placed');
    if (this.currentBidderSeatIndex === null) throw new Error('Bidding not started');
    if (player.seatIndex !== this.currentBidderSeatIndex) {
      throw new Error('Not your turn to bid');
    }

    const validation = BidEngine.validateBid(bid, this.roomType);
    if (!validation.ok) throw new Error(validation.error);

    player.bid = bid;
    this.emit({ type: 'bid', userId, bid });

    const nextSeat = this.nextBidderSeat(player.seatIndex);
    if (nextSeat !== null) {
      this.currentBidderSeatIndex = nextSeat;
    } else {
      this.currentBidderSeatIndex = null;
      this.validateBidsOrReshuffle();
    }
  }

  /** Next clockwise seat that has not bid yet. */
  private nextBidderSeat(fromSeat: number): number | null {
    const ordered = [...this.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const start = ordered.findIndex((p) => p.seatIndex === fromSeat);
    for (let i = 1; i <= ordered.length; i++) {
      const p = ordered[(start + i) % ordered.length];
      if (p.bid === null) return p.seatIndex;
    }
    return null;
  }

  private validateBidsOrReshuffle(): void {
    if (this.players.some((p) => p.bid === null)) return;

    const bids = this.players.map((p) => p.bid as number);
    const decision = ReshuffleEngine.evaluateBidTotal(
      bids,
      this.minTotalBid,
      this.shufflerSeatIndex,
      this.consecutiveReshuffles,
      this.players.length,
    );

    if (decision.shouldReshuffle) {
      this.applyReshuffle(decision);
      return;
    }

    // Reset consecutive on successful deal advancing to play
    this.consecutiveReshuffles = 0;
    this.startPlaying();
  }

  private startPlaying(): void {
    this.setPhase('playing');
    const leadSeat = this.firstBidderSeat();

    this.currentTurnSeatIndex = leadSeat;
    this.currentTrick = {
      number: 1,
      leadSeatIndex: leadSeat,
      leadSuit: null,
      plays: [],
      winnerUserId: null,
    };

    this.emit({ type: 'playing', leadSeatIndex: leadSeat });
  }

  playCard(userId: string, cardId: string): void {
    this.assertPhase('playing');
    if (this.currentTurnSeatIndex === null || !this.currentTrick) {
      throw new Error('No active trick');
    }

    const player = this.requirePlayer(userId);
    if (player.seatIndex !== this.currentTurnSeatIndex) {
      throw new Error('Not your turn');
    }

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) throw new Error('Card not in hand');

    const leadSuit = this.currentTrick.leadSuit;
    if (!RuleEngine.isLegalPlay(player.hand, card, leadSuit)) {
      throw new Error('Illegal card — must follow suit if possible');
    }

    // Remove card from hand
    player.hand = player.hand.filter((c) => c.id !== cardId);

    if (!this.currentTrick.leadSuit) {
      this.currentTrick.leadSuit = card.suit;
    }

    const play: TrickPlay = {
      userId,
      card,
      seatIndex: player.seatIndex,
    };
    this.currentTrick.plays.push(play);
    this.emit({ type: 'cardPlayed', play });

    if (this.currentTrick.plays.length === this.players.length) {
      this.resolveTrick();
    } else {
      this.currentTurnSeatIndex = (this.currentTurnSeatIndex + 1) % this.players.length;
    }
  }

  private resolveTrick(): void {
    if (!this.currentTrick || !this.currentTrick.leadSuit) {
      throw new Error('Cannot resolve incomplete trick');
    }

    this.setPhase('trick_end');
    const winnerUserId = RuleEngine.determineTrickWinner(
      this.currentTrick.plays,
      this.currentTrick.leadSuit as Suit,
    );
    this.currentTrick.winnerUserId = winnerUserId;
    this.lastTrickWinner = winnerUserId;

    const winner = this.requirePlayer(winnerUserId);
    winner.tricksWon += 1;
    this.tricksPlayedThisRound += 1;

    this.emit({ type: 'trickEnd', winnerUserId, trick: { ...this.currentTrick } });

    if (this.allPlayersMetBids() || this.tricksPlayedThisRound >= this.tricksPerRound) {
      this.endRound();
      return;
    }

    // Next trick — winner leads
    this.setPhase('playing');
    this.currentTurnSeatIndex = winner.seatIndex;
    this.currentTrick = {
      number: this.tricksPlayedThisRound + 1,
      leadSeatIndex: winner.seatIndex,
      leadSuit: null,
      plays: [],
      winnerUserId: null,
    };
  }

  private allPlayersMetBids(): boolean {
    return this.players.every((p) => p.bid !== null && p.tricksWon >= (p.bid as number));
  }

  private endRound(): void {
    this.currentTrick = null;
    this.currentTurnSeatIndex = null;
    this.players.forEach((p) => {
      p.hand = [];
    });

    const scores = ScoreEngine.computeRoundScores(
      this.players.map((p) => ({
        userId: p.userId,
        bid: p.bid as number,
        tricksWon: p.tricksWon,
      })),
    );

    for (const s of scores) {
      const player = this.requirePlayer(s.userId);
      player.totalScore += s.points;
    }

    this.roundScoresHistory.push(scores);
    this.roundApprovals.clear();
    this.scoreboardEndsAt = Date.now() + 10_000;
    this.setPhase('scoreboard');
    this.emit({ type: 'roundScore', scores, round: this.round });

    const totals = new Map(this.players.map((p) => [p.userId, p.totalScore]));
    if (this.round >= TOTAL_ROUNDS && ScoreEngine.isTopTwoTied(totals)) {
      this.scheduledTotalRounds = this.round + 1;
    }

    this.shufflerSeatIndex = (this.shufflerSeatIndex + 1) % this.players.length;
    this.lastTrickWinner = null;
  }

  /** All players must approve before the next round begins. */
  approveNextRound(userId: string): void {
    this.assertPhase('scoreboard');
    this.requirePlayer(userId);
    this.roundApprovals.add(userId);
    if (this.roundApprovals.size >= this.players.length) {
      this.continueToNextRound();
    }
  }

  /** Advances to the next round (all approved, or scoreboard timer elapsed). */
  continueToNextRound(): void {
    if (this.phase !== 'scoreboard') throw new Error('Not in scoreboard phase');
    this.roundApprovals.clear();
    this.scoreboardEndsAt = null;

    const totals = new Map(this.players.map((p) => [p.userId, p.totalScore]));
    const topTwoTied = ScoreEngine.isTopTwoTied(totals);

    if (this.round >= TOTAL_ROUNDS && topTwoTied) {
      this.scheduledTotalRounds = this.round + 1;
      this.emit({ type: 'nextRound', round: this.round + 1 });
      this.beginRound();
      return;
    }

    if (this.round >= this.scheduledTotalRounds) {
      this.finishGame();
      return;
    }

    this.emit({ type: 'nextRound', round: this.round + 1 });
    this.beginRound();
  }

  private finishGame(): void {
    this.setPhase('finished');
    const totals = new Map(this.players.map((p) => [p.userId, p.totalScore]));
    const winners = ScoreEngine.determineWinners(totals);
    const totalsObj = Object.fromEntries(totals);
    this.emit({ type: 'finished', winners, totals: totalsObj });
  }

  setConnected(userId: string, connected: boolean): void {
    const player = this.players.find((p) => p.userId === userId);
    if (!player) return;
    player.isConnected = connected;
    if (connected) player.lastHeartbeatAt = Date.now();
  }

  heartbeat(userId: string): void {
    const player = this.requirePlayer(userId);
    player.lastHeartbeatAt = Date.now();
    player.isConnected = true;
  }

  updatePlayerUsername(userId: string, username: string): void {
    const player = this.players.find((p) => p.userId === userId);
    if (player) player.username = username;
  }

  updatePlayerAvatar(userId: string, avatarId: number): void {
    const player = this.players.find((p) => p.userId === userId);
    if (player) player.avatarId = avatarId;
  }

  getPrivateSnapshot(userId: string): PrivateGameSnapshot {
    const me = this.requirePlayer(userId);
    const reshuffleReasons = RuleEngine.getHandReshuffleReasons(me.hand, this.allSpadesInDeck);
    return {
      ...this.getPublicSnapshot(),
      myHand: [...me.hand],
      myUserId: userId,
      canBidReshuffle:
        this.phase === 'bidding' &&
        this.currentBidderSeatIndex === me.seatIndex &&
        reshuffleReasons.length > 0,
      reshuffleReasons,
    };
  }

  getPublicSnapshot() {
    return {
      roomId: this.roomId,
      roomType: this.roomType,
      phase: this.phase,
      round: this.round,
      totalRounds: this.scheduledTotalRounds,
      shufflerSeatIndex: this.shufflerSeatIndex,
      consecutiveReshuffles: this.consecutiveReshuffles,
      currentTurnSeatIndex: this.currentTurnSeatIndex,
      currentBidderSeatIndex: this.currentBidderSeatIndex,
      roundApprovals: [...this.roundApprovals],
      players: this.players.map((p) => this.toPublicPlayer(p)),
      currentTrick: this.currentTrick
        ? {
            ...this.currentTrick,
            plays: [...this.currentTrick.plays],
          }
        : null,
      lastTrickWinner: this.lastTrickWinner,
      minTotalBid: this.minTotalBid,
      scores: this.roundScoresHistory[this.roundScoresHistory.length - 1] ?? [],
      scoreHistory: this.roundScoresHistory.map((scores, index) => ({
        round: index + 1,
        scores: scores.map((s) => ({ ...s })),
      })),
      scoreboardEndsAt: this.scoreboardEndsAt,
      reshuffleNotice: this.lastReshuffleNotice,
      reshuffleEpoch: this.reshuffleEpoch,
    };
  }

  getTotals(): Record<string, number> {
    return Object.fromEntries(this.players.map((p) => [p.userId, p.totalScore]));
  }

  getPlayers() {
    return this.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      seatIndex: p.seatIndex,
      totalScore: p.totalScore,
      bid: p.bid,
      tricksWon: p.tricksWon,
    }));
  }

  private toPublicPlayer(p: GamePlayerState): PublicGamePlayerState {
    return {
      userId: p.userId,
      username: p.username,
      seatIndex: p.seatIndex,
      avatarId: p.avatarId,
      handCount: p.hand.length,
      bid: p.bid,
      tricksWon: p.tricksWon,
      totalScore: p.totalScore,
      isConnected: p.isConnected,
    };
  }

  private setPhase(phase: RoomPhase): void {
    this.phase = phase;
  }

  private assertPhase(expected: RoomPhase): void {
    if (this.phase !== expected) {
      throw new Error(`Expected phase ${expected}, currently ${this.phase}`);
    }
  }

  private requirePlayer(userId: string): GamePlayerState {
    const player = this.players.find((p) => p.userId === userId);
    if (!player) throw new Error('Player not in this game');
    return player;
  }
}
