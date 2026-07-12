import type { Room, RoomPlayer } from '../models/types';

/** Lobby / game phase ordering — higher means further along. */
export function roomPhaseRank(phase: string | undefined): number {
  if (!phase || phase === 'waiting') return 0;
  if (phase === 'countdown') return 1;
  if (phase === 'finished') return 50;
  return 10;
}

export function sanitizeStartApprovals(
  players: RoomPlayer[],
  approvals: string[] | undefined,
): string[] {
  if (!approvals?.length) return [];
  const seated = new Set(players.map((p) => p.userId));
  return approvals.filter((id) => seated.has(id));
}

export function countReadyPlayers(players: RoomPlayer[], approvals: string[] | undefined): number {
  if (!approvals?.length) return 0;
  const ready = new Set(approvals);
  return players.filter((p) => ready.has(p.userId)).length;
}

export function allPlayersReady(room: Pick<Room, 'players' | 'maxPlayers' | 'startApprovals'>): boolean {
  if (room.players.length < room.maxPlayers) return false;
  const approvals = sanitizeStartApprovals(room.players, room.startApprovals);
  return room.players.every((p) => approvals.includes(p.userId));
}

function isLobbyReset(prev: Room, next: Room): boolean {
  return (
    next.phase === 'waiting' &&
    next.players.length < next.maxPlayers &&
    prev.players.length >= prev.maxPlayers
  );
}

/** Drop out-of-order room broadcasts that would rewind lobby progress. */
export function isStaleRoomUpdate(prev: Room, next: Room): boolean {
  if (prev.id !== next.id) return false;

  const prevRank = roomPhaseRank(prev.phase);
  const nextRank = roomPhaseRank(next.phase);

  if (nextRank < prevRank && !isLobbyReset(prev, next)) {
    return true;
  }

  if (next.phase !== 'waiting' || prev.phase !== 'waiting') {
    return false;
  }

  const prevReady = countReadyPlayers(prev.players, prev.startApprovals);
  const nextReady = countReadyPlayers(next.players, next.startApprovals);

  if (
    prev.players.length >= prev.maxPlayers &&
    next.players.length >= next.maxPlayers &&
    nextReady < prevReady
  ) {
    return true;
  }

  return false;
}

export function mergeRoomPhase(prev: Room, next: Room): string {
  if (isLobbyReset(prev, next)) return next.phase;
  if (roomPhaseRank(next.phase) < roomPhaseRank(prev.phase)) return prev.phase;
  return next.phase;
}
