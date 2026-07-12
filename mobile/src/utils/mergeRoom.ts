import type { Room } from '../models/types';
import {
  isStaleRoomUpdate,
  mergeRoomPhase,
  sanitizeStartApprovals,
} from './roomPhase';

/** Merge room broadcasts so partial / out-of-order updates do not rewind lobby state. */
export function mergeRoom(prev: Room | null, next: Room): Room {
  if (!prev || prev.id !== next.id) {
    return {
      ...next,
      startApprovals: sanitizeStartApprovals(next.players, next.startApprovals),
    };
  }

  if (isStaleRoomUpdate(prev, next)) {
    return prev;
  }

  const players = Array.isArray(next.players) ? next.players : prev.players;
  const startApprovals = sanitizeStartApprovals(
    players,
    next.startApprovals !== undefined ? next.startApprovals : (prev.startApprovals ?? []),
  );

  return {
    ...prev,
    ...next,
    phase: mergeRoomPhase(prev, { ...next, players }),
    players,
    startApprovals,
    suspendApprovals:
      next.suspendApprovals !== undefined
        ? [...next.suspendApprovals]
        : [...(prev.suspendApprovals ?? [])],
    chat: next.chat ?? prev.chat,
  };
}
