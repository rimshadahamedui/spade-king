export type PublicRoomStatus = 'open' | 'starting' | 'playing';

export function inferPublicRoomStatus(phase?: string): PublicRoomStatus {
  if (!phase || phase === 'waiting') return 'open';
  if (phase === 'countdown') return 'starting';
  return 'playing';
}

export function isPublicRoomJoinable(status: PublicRoomStatus): boolean {
  return status === 'open';
}

export function isPublicRoomWatchable(status: PublicRoomStatus): boolean {
  return status === 'playing';
}

export function publicRoomStatusLabel(status: PublicRoomStatus): string {
  if (status === 'playing') return 'Playing';
  if (status === 'starting') return 'Starting';
  return 'Open';
}
