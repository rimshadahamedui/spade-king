import { create } from 'zustand';
import type { PrivateGameSnapshot, Room, Card } from '../models/types';
import { mergeRoom } from '../utils/mergeRoom';

export interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  at: number;
}

interface TrickPlay {
  userId: string;
  card: Card;
  seatIndex: number;
}

interface GameState {
  room: Room | null;
  snapshot: PrivateGameSnapshot | null;
  countdown: number | null;
  chat: ChatMessage[];
  lastError: string | null;
  socketConnected: boolean;
  heldTrick: {
    plays: TrickPlay[];
    winnerUserId: string;
  } | null;
  trickCollect: {
    plays: TrickPlay[];
    winnerUserId: string;
    visibleCardIds: string[];
  } | null;
  tableOverlay: string | null;
  hideHand: boolean;
  pendingSnapshot: PrivateGameSnapshot | null;
  lastRoomCloseReason: 'suspended' | null;
  setRoom: (room: Room | null) => void;
  setSnapshot: (snapshot: PrivateGameSnapshot | null) => void;
  applySuspendApprovals: (suspendApprovals: string[]) => void;
  setCountdown: (n: number | null) => void;
  setChat: (messages: ChatMessage[]) => void;
  pushChat: (msg: ChatMessage) => void;
  setError: (message: string | null) => void;
  setSocketConnected: (connected: boolean) => void;
  setTableOverlay: (text: string | null) => void;
  setHideHand: (hideHand: boolean) => void;
  setPendingSnapshot: (snapshot: PrivateGameSnapshot | null) => void;
  clearRoomCloseReason: () => void;
  setHeldTrick: (payload: GameState['heldTrick']) => void;
  setTrickCollect: (payload: GameState['trickCollect']) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  snapshot: null,
  countdown: null,
  chat: [],
  lastError: null,
  socketConnected: false,
  heldTrick: null,
  trickCollect: null,
  tableOverlay: null,
  hideHand: false,
  pendingSnapshot: null,
  lastRoomCloseReason: null,
  setRoom: (room) =>
    set((s) => {
      const merged = room && s.room ? mergeRoom(s.room, room) : room;
      return {
        room: merged,
        chat: merged?.chat ?? s.chat,
        snapshot:
          s.snapshot && merged?.suspendApprovals !== undefined
            ? { ...s.snapshot, suspendApprovals: [...merged.suspendApprovals] }
            : s.snapshot,
      };
    }),
  applySuspendApprovals: (suspendApprovals) =>
    set((s) => {
      const approvals = [...suspendApprovals];
      return {
        room: s.room ? { ...s.room, suspendApprovals: approvals } : s.room,
        snapshot: s.snapshot ? { ...s.snapshot, suspendApprovals: approvals } : s.snapshot,
      };
    }),
  setSnapshot: (snapshot) =>
    set((s) => ({
      snapshot,
      ...(snapshot?.phase === 'scoreboard'
        ? { heldTrick: null, trickCollect: null }
        : {}),
    })),
  setCountdown: (countdown) => set({ countdown }),
  setChat: (chat) => set({ chat }),
  pushChat: (msg) => set((s) => ({ chat: [...s.chat.slice(-99), msg] })),
  setError: (lastError) => set({ lastError }),
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setTableOverlay: (tableOverlay) => set({ tableOverlay }),
  setHideHand: (hideHand) => set({ hideHand }),
  setPendingSnapshot: (pendingSnapshot) => set({ pendingSnapshot }),
  clearRoomCloseReason: () => set({ lastRoomCloseReason: null }),
  setHeldTrick: (heldTrick) => set({ heldTrick }),
  setTrickCollect: (trickCollect) => set({ trickCollect }),
  reset: () =>
    set({
      room: null,
      snapshot: null,
      countdown: null,
      chat: [],
      lastError: null,
      tableOverlay: null,
      hideHand: false,
      pendingSnapshot: null,
      heldTrick: null,
      trickCollect: null,
      lastRoomCloseReason: null,
    }),
}));
