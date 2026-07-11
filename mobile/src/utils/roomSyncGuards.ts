/** Module-level guards that suppress stale room/game events after leaving a table. */
let suppressGameSnapshots = false;
let ignoreRoomId: string | null = null;

export function shouldIgnoreRoomUpdate(roomId: string | undefined): boolean {
  return !!ignoreRoomId && roomId === ignoreRoomId;
}

export function shouldSuppressGameSnapshots(): boolean {
  return suppressGameSnapshots;
}

export function clearRoomSyncGuards(): void {
  suppressGameSnapshots = false;
  ignoreRoomId = null;
}

export function armRoomClosedGuards(roomId: string | null): void {
  suppressGameSnapshots = true;
  ignoreRoomId = roomId;
}

export function tryClearSuppressForLobbyPhase(phase: string | undefined): void {
  if (phase === 'waiting' || phase === 'countdown') {
    suppressGameSnapshots = false;
    ignoreRoomId = null;
  }
}
