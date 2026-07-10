import { describe, expect, it } from 'vitest';
import { GameEngine } from '../../src/game';
import { RoomService, type LiveRoom } from '../../src/services/RoomService';
import { advanceToPlaying, createEngine, makePlayers } from './simulationHelpers';

function seedLiveRoom(service: RoomService, roomType: 3 | 4 | 5): LiveRoom {
  const engine = createEngine(roomType, 11);
  engine.startGame();
  advanceToPlaying(engine, roomType);

  const live: LiveRoom = {
    roomId: `room-${roomType}`,
    inviteCode: 'TEST01',
    roomType,
    visibility: 'private',
    hostId: 'u0',
    phase: engine.getPhase(),
    players: makePlayers(roomType).map((p) => ({
      ...p,
      isReady: true,
      isConnected: true,
      socketId: `sock-${p.userId}`,
    })),
    maxPlayers: roomType,
    engine,
    chat: [],
    lastActivityAt: Date.now(),
    startApprovals: makePlayers(roomType).map((p) => p.userId),
    suspendApprovals: [],
  };

  const internal = service as unknown as {
    rooms: Map<string, LiveRoom>;
    userToRoom: Map<string, string>;
  };
  internal.rooms.set(live.roomId, live);
  for (const p of live.players) {
    internal.userToRoom.set(p.userId, live.roomId);
  }

  return live;
}

describe('RoomService suspend simulation', () => {
  for (const roomType of [3, 4, 5] as const) {
    it(`tracks partial suspend votes in ${roomType}-player mode`, () => {
      const service = new RoomService();
      const live = seedLiveRoom(service, roomType);

      service.requestSuspend('u0');
      expect(service.allSuspendConfirmed(live)).toBe(false);
      expect(live.suspendApprovals).toEqual(['u0']);

      service.requestSuspend('u0');
      expect(live.suspendApprovals).toEqual(['u0']);
    });

    it(`confirms suspend only when every player agrees in ${roomType}-player mode`, () => {
      const service = new RoomService();
      const live = seedLiveRoom(service, roomType);

      for (const p of live.players.slice(0, -1)) {
        service.requestSuspend(p.userId);
        expect(service.allSuspendConfirmed(live)).toBe(false);
      }

      const last = live.players[live.players.length - 1];
      service.requestSuspend(last.userId);
      expect(service.allSuspendConfirmed(live)).toBe(true);
      expect(live.suspendApprovals).toHaveLength(roomType);
    });

    it(`rejects suspend when game not in progress in ${roomType}-player mode`, () => {
      const service = new RoomService();
      const live = seedLiveRoom(service, roomType);
      live.engine = null;

      expect(() => service.requestSuspend('u0')).toThrow(/not in progress/i);
    });
  }
});

describe('GameEngine constructor validation', () => {
  it('rejects wrong player counts for each mode', () => {
    expect(
      () =>
        new GameEngine({
          roomId: 'bad',
          roomType: 3,
          players: makePlayers(4),
        }),
    ).toThrow(/Expected 3 players/);

    expect(
      () =>
        new GameEngine({
          roomId: 'bad',
          roomType: 5,
          players: makePlayers(3),
        }),
    ).toThrow(/Expected 5 players/);
  });
});
