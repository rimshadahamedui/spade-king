import type { Room } from '../models/types';

/** Merge room broadcasts so partial updates do not wipe start votes or player list. */
export function mergeRoom(prev: Room | null, next: Room): Room {
  if (!prev || prev.id !== next.id) return next;

  const players =
    Array.isArray(next.players) ? next.players : prev.players;

  return {
    ...prev,
    ...next,
    players,
    startApprovals:
      next.startApprovals !== undefined ? next.startApprovals : (prev.startApprovals ?? []),
    suspendApprovals:
      next.suspendApprovals !== undefined
        ? [...next.suspendApprovals]
        : [...(prev.suspendApprovals ?? [])],
    chat: next.chat ?? prev.chat,
  };
}
