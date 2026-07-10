import { describe, expect, it } from 'vitest';
import { RoomService } from '../../src/services/RoomService';
import { createEngine, makePlayers } from './simulationHelpers';

describe('RoomService connection stability', () => {
  it('ignores stale socket disconnect after a newer socket binds', () => {
    const service = new RoomService();
    const engine = createEngine(3, 4);
    engine.startGame();

    const live = {
      roomId: 'room-stale',
      inviteCode: 'ABC123',
      roomType: 3 as const,
      visibility: 'public' as const,
      hostId: 'u0',
      phase: 'waiting',
      players: makePlayers(3).map((p) => ({
        ...p,
        isReady: true,
        isConnected: true,
        socketId: 'sock-old',
      })),
      maxPlayers: 3,
      engine,
      chat: [],
      lastActivityAt: Date.now(),
      startApprovals: [],
      suspendApprovals: [],
    };

    const internal = service as unknown as {
      rooms: Map<string, typeof live>;
      userToRoom: Map<string, string>;
    };
    internal.rooms.set(live.roomId, live);
    for (const p of live.players) internal.userToRoom.set(p.userId, live.roomId);

    service.bindSocket('u0', 'sock-new');
    expect(live.players[0].socketId).toBe('sock-new');
    expect(live.players[0].isConnected).toBe(true);

    service.markDisconnected('u0', 'sock-old');
    expect(live.players[0].socketId).toBe('sock-new');
    expect(live.players[0].isConnected).toBe(true);

    service.markDisconnected('u0', 'sock-new');
    expect(live.players[0].socketId).toBeUndefined();
    expect(live.players[0].isConnected).toBe(false);
  });
});
