/**
 * Shared domain types for the R-SPADE custom Spade ruleset.
 * No partnerships, nil, bags, or blind nil.
 */

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  /** Compact id e.g. "AS", "10H" — used for wire + equality checks */
  id: string;
}

export type RoomType = 3 | 4 | 5;

export type RoomVisibility = 'public' | 'private';

export type RoomPhase =
  | 'waiting'
  | 'countdown'
  | 'dealing'
  | 'reshuffle_check'
  | 'bidding'
  | 'playing'
  | 'trick_end'
  | 'scoreboard'
  | 'finished';

export type AuthProvider = 'email' | 'google' | 'apple' | 'guest';

export interface PlayerSeat {
  userId: string;
  username: string;
  seatIndex: number;
  isReady: boolean;
  isConnected: boolean;
  isGuest: boolean;
}

export interface RoundBid {
  userId: string;
  bid: number;
}

export interface TrickPlay {
  userId: string;
  card: Card;
  seatIndex: number;
}

export interface RoundScore {
  userId: string;
  bid: number;
  tricksWon: number;
  points: number;
}

export interface GamePlayerState {
  userId: string;
  username: string;
  seatIndex: number;
  hand: Card[];
  bid: number | null;
  tricksWon: number;
  totalScore: number;
  isConnected: boolean;
  lastHeartbeatAt: number;
}

export interface PublicGamePlayerState {
  userId: string;
  username: string;
  seatIndex: number;
  handCount: number;
  bid: number | null;
  tricksWon: number;
  totalScore: number;
  isConnected: boolean;
}

export interface TrickState {
  number: number;
  leadSeatIndex: number;
  leadSuit: Suit | null;
  plays: TrickPlay[];
  winnerUserId: string | null;
}

export interface GameSnapshot {
  roomId: string;
  roomType: RoomType;
  phase: RoomPhase;
  round: number;
  totalRounds: number;
  shufflerSeatIndex: number;
  consecutiveReshuffles: number;
  currentTurnSeatIndex: number | null;
  currentBidderSeatIndex: number | null;
  roundApprovals: string[];
  players: PublicGamePlayerState[];
  currentTrick: TrickState | null;
  lastTrickWinner: string | null;
  minTotalBid: number;
  scores: RoundScore[];
  scoreHistory: Array<{ round: number; scores: RoundScore[] }>;
  /** Unix ms when scoreboard auto-advances; null outside scoreboard phase */
  scoreboardEndsAt: number | null;
  reshuffleNotice: { username: string; message: string } | null;
  reshuffleEpoch: number;
}

export type ReshuffleReason =
  | 'NO_SPADES'
  | 'ONLY_LOWEST_SPADE'
  | 'NO_FACE_CARDS'
  | 'BID_TOTAL_BELOW_MIN';

/** Private snapshot includes the requesting player's full hand. */
export interface PrivateGameSnapshot extends GameSnapshot {
  myHand: Card[];
  myUserId: string;
  canBidReshuffle: boolean;
  /** Why this player's hand qualifies for a reshuffle (rules 1–3). */
  reshuffleReasons: ReshuffleReason[];
}

export interface JwtPayload {
  sub: string;
  username: string;
  provider: AuthProvider;
  isGuest: boolean;
}
