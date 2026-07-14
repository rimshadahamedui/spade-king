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
  id: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  provider: string;
  isGuest: boolean;
  avatarId?: number | null;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  seatIndex: number;
  isReady: boolean;
  isConnected: boolean;
  avatarId?: number;
}

export interface Room {
  id: string;
  inviteCode: string;
  roomType: 3 | 4 | 5;
  visibility: 'public' | 'private';
  hostId: string;
  phase: string;
  players: RoomPlayer[];
  maxPlayers: number;
  matchId?: string;
  startApprovals?: string[];
  suspendApprovals?: string[];
  countdownRemaining?: number | null;
  spectatorCount?: number;
  chat?: Array<{ userId: string; username: string; message: string; at: number }>;
  publicSnapshot?: GameSnapshot | null;
  snapshot?: PrivateGameSnapshot;
}

export interface GamePlayer {
  userId: string;
  username: string;
  seatIndex: number;
  avatarId?: number;
  handCount: number;
  bid: number | null;
  tricksWon: number;
  totalScore: number;
  isConnected: boolean;
}

export interface GameSnapshot {
  roomId: string;
  roomType: 3 | 4 | 5;
  phase: string;
  round: number;
  totalRounds: number;
  shufflerSeatIndex: number;
  consecutiveReshuffles: number;
  currentTurnSeatIndex: number | null;
  currentBidderSeatIndex: number | null;
  roundApprovals: string[];
  players: GamePlayer[];
  currentTrick: {
    number: number;
    leadSeatIndex: number;
    leadSuit: Suit | null;
    plays: Array<{ userId: string; card: Card; seatIndex: number }>;
    winnerUserId: string | null;
  } | null;
  lastTrickWinner: string | null;
  minTotalBid: number;
  scores: Array<{ userId: string; bid: number; tricksWon: number; points: number }>;
  scoreHistory?: Array<{
    round: number;
    scores: Array<{ userId: string; bid: number; tricksWon: number; points: number }>;
  }>;
  scoreboardEndsAt?: number | null;
  reshuffleNotice?: { username: string; message: string } | null;
  reshuffleEpoch?: number;
  suspendApprovals?: string[];
}

export type ReshuffleReason =
  | 'NO_SPADES'
  | 'ONLY_LOWEST_SPADE'
  | 'NO_FACE_CARDS'
  | 'BID_TOTAL_BELOW_MIN';

export interface PrivateGameSnapshot extends GameSnapshot {
  myHand: Card[];
  myUserId: string;
  canBidReshuffle?: boolean;
  reshuffleReasons?: ReshuffleReason[];
}
