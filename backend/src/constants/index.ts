import type { RoomType, Suit, Rank } from '../types';

export const TOTAL_ROUNDS = 13;
export const MIN_TOTAL_BID = 8;
export const MAX_CONSECUTIVE_RESHUFFLES = 3;

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_ORDER: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const FACE_RANKS: Rank[] = ['J', 'Q', 'K', 'A'];

export const TRUMP_SUIT: Suit = 'S';

export interface RoomModeConfig {
  roomType: RoomType;
  playerCount: number;
  cardsPerPlayer: number;
  totalCards: number;
  minTotalBid: number;
  /** Ranks removed from every suit */
  removedRanks: Rank[];
  /** Specific cards removed (over and above removedRanks) */
  removedCards: Array<{ suit: Suit; rank: Rank }>;
}

export const ROOM_MODE_CONFIG: Record<RoomType, RoomModeConfig> = {
  3: {
    roomType: 3,
    playerCount: 3,
    cardsPerPlayer: 12,
    totalCards: 36,
    minTotalBid: 9,
    removedRanks: ['2', '3', '4', '5'],
    removedCards: [],
  },
  4: {
    roomType: 4,
    playerCount: 4,
    cardsPerPlayer: 10,
    totalCards: 40,
    minTotalBid: MIN_TOTAL_BID,
    removedRanks: ['2', '3', '4'],
    removedCards: [],
  },
  5: {
    roomType: 5,
    playerCount: 5,
    cardsPerPlayer: 10,
    totalCards: 50,
    minTotalBid: MIN_TOTAL_BID,
    removedRanks: [],
    removedCards: [
      { suit: 'C', rank: '2' },
      { suit: 'D', rank: '2' },
    ],
  },
};

export const SOCKET_EVENTS = {
  // Client → Server
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  DELETE_ROOM: 'deleteRoom',
  ADMIN_PURGE_ROOMS: 'adminPurgeRooms',
  APPROVE_NEXT_ROUND: 'approveNextRound',
  REQUEST_SUSPEND: 'requestSuspend',
  CONFIRM_START: 'confirmStart',
  PLAYER_READY: 'playerReady',
  REQUEST_RESHUFFLE: 'requestReshuffle',
  ACCEPT_RESHUFFLE: 'acceptReshuffle',
  PLACE_BID: 'placeBid',
  PLAY_CARD: 'playCard',
  SEND_CHAT: 'sendChat',
  HEARTBEAT: 'heartbeat',
  RECONNECT: 'reconnect',

  // Server → Client
  ROOM_UPDATED: 'roomUpdated',
  GAME_START: 'gameStart',
  SHUFFLE: 'shuffle',
  DEAL_CARDS: 'dealCards',
  RESHUFFLE_STATUS: 'reshuffleStatus',
  BIDDING_STARTED: 'biddingStarted',
  BID_PLACED: 'bidPlaced',
  PLAYING_STARTED: 'playingStarted',
  CARD_PLAYED: 'cardPlayed',
  END_TRICK: 'endTrick',
  NEXT_ROUND: 'nextRound',
  ROUND_SCORE: 'roundScore',
  SCOREBOARD: 'scoreboard',
  GAME_FINISHED: 'gameFinished',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  PLAYER_RECONNECTED: 'playerReconnected',
  SUSPEND_UPDATED: 'suspendUpdated',
  CHAT_MESSAGE: 'chatMessage',
  CHAT_HISTORY: 'chatHistory',
  ROOM_CLOSED: 'roomClosed',
  ERROR: 'error',
  COUNTDOWN: 'countdown',
} as const;

export const REDIS_KEYS = {
  room: (roomId: string) => `room:${roomId}`,
  roomPlayers: (roomId: string) => `room:${roomId}:players`,
  userSocket: (userId: string) => `user:${userId}:socket`,
  inviteCode: (code: string) => `invite:${code}`,
  rateLimit: (ip: string) => `rl:${ip}`,
};

export const ADMIN_EMAIL = 'rimshad.rimo@gmail.com';
