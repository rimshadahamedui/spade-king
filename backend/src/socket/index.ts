import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { SOCKET_EVENTS } from '../constants';
import { AuthService } from '../services/AuthService';
import { roomService } from '../services/RoomService';
import { logger } from '../utils/logger';
import type { JwtPayload, RoomType, RoomVisibility } from '../types';

interface AuthedSocket extends Socket {
  data: {
    user: JwtPayload;
  };
}

const authService = new AuthService();
const scoreboardTimers = new Map<string, NodeJS.Timeout>();
const reshuffleCheckTimers = new Map<string, NodeJS.Timeout>();
const countdownRooms = new Set<string>();
const countdownRemaining = new Map<string, number>();
const engineBroadcastAttached = new Set<string>();
const SCOREBOARD_AUTO_MS = 10_000;
const RESHUFFLE_CHECK_AUTO_MS = 5_000;

function clearScoreboardTimer(roomId: string): void {
  const timer = scoreboardTimers.get(roomId);
  if (timer) clearTimeout(timer);
  scoreboardTimers.delete(roomId);
}

function clearReshuffleCheckTimer(roomId: string): void {
  const timer = reshuffleCheckTimers.get(roomId);
  if (timer) clearTimeout(timer);
  reshuffleCheckTimers.delete(roomId);
}

function scheduleReshuffleCheckAdvance(io: Server, roomId: string): void {
  clearReshuffleCheckTimer(roomId);
  const timer = setTimeout(() => {
    reshuffleCheckTimers.delete(roomId);
    const live = roomService.getLiveRoom(roomId);
    if (live?.engine?.getPhase() !== 'reshuffle_check') return;
    try {
      live.engine.proceedPastReshuffleCheck();
      broadcastGame(io, roomId);
    } catch {
      /* phase may have changed */
    }
  }, RESHUFFLE_CHECK_AUTO_MS);
  reshuffleCheckTimers.set(roomId, timer);
}

function scheduleScoreboardAdvance(io: Server, roomId: string): void {
  clearScoreboardTimer(roomId);
  const timer = setTimeout(() => {
    scoreboardTimers.delete(roomId);
    const room = roomService.getLiveRoom(roomId);
    if (!room?.engine || room.engine.getPhase() !== 'scoreboard') return;
    try {
      room.engine.continueToNextRound();
      broadcastGame(io, roomId);
    } catch {
      /* phase may have changed */
    }
  }, SCOREBOARD_AUTO_MS);
  scoreboardTimers.set(roomId, timer);
}

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') },
    pingInterval: env.HEARTBEAT_INTERVAL_MS,
    pingTimeout: env.PLAYER_TIMEOUT_MS,
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.replace('Bearer ', '') as string | undefined);
      if (!token) return next(new Error('Unauthorized'));
      socket.data.user = authService.verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authed = socket as AuthedSocket;
    const user = authed.data.user;
    logger.info('Socket connected', { userId: user.sub, socketId: socket.id });

    roomService.bindSocket(user.sub, socket.id);
    const existing = roomService.getRoomByUser(user.sub);
    if (existing) {
      void socket.join(existing.roomId);
      emitRoomSession(socket, existing, user.sub);
      io.to(existing.roomId).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
        userId: user.sub,
        room: serializeRoom(existing),
      });
    }

    socket.on(SOCKET_EVENTS.CREATE_ROOM, async (payload, ack) => {
      try {
        if (user.isGuest) {
          throw new Error('Guest players cannot create rooms. Sign in to host a table.');
        }
        const room = await roomService.createRoom({
          hostId: user.sub,
          username: user.username,
          roomType: payload.roomType as RoomType,
          visibility: (payload.visibility ?? 'public') as RoomVisibility,
          hostIsGuest: user.isGuest,
        });
        roomService.bindSocket(user.sub, socket.id);
        await socket.join(room.roomId);
        const data = serializeRoom(room);
        socket.emit(SOCKET_EVENTS.ROOM_UPDATED, data);
        socket.emit(SOCKET_EVENTS.CHAT_HISTORY, { messages: room.chat });
        if (typeof ack === 'function') ack({ success: true, data });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (payload, ack) => {
      try {
        const room = await roomService.joinRoom({
          inviteCode: payload.inviteCode,
          roomId: payload.roomId,
          userId: user.sub,
          username: user.username,
        });
        roomService.bindSocket(user.sub, socket.id);
        await socket.join(room.roomId);
        const data = roomSessionForUser(room, user.sub);
        io.to(room.roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, serializeRoom(room));
        if (data.snapshot) socket.emit(SOCKET_EVENTS.DEAL_CARDS, data.snapshot);
        socket.emit(SOCKET_EVENTS.CHAT_HISTORY, { messages: room.chat });
        if (typeof ack === 'function') ack({ success: true, data });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, async (_payload, ack) => {
      try {
        const before = roomService.getRoomByUser(user.sub);
        const roomId = before?.roomId;
        const room = await roomService.leaveRoom(user.sub);
        if (roomId) await socket.leave(roomId);
        if (room) {
          io.to(room.roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, serializeRoom(room));
        }
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.DELETE_ROOM, async (_payload, ack) => {
      try {
        const live = roomService.getRoomByUser(user.sub);
        if (!live) throw new Error('Not in a room');
        const { roomId } = await roomService.deleteRoom(user.sub);
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { roomId });
        await socket.leave(roomId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.CONFIRM_START, async (_payload, ack) => {
      try {
        const room = roomService.confirmStart(user.sub);
        io.to(room.roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, serializeRoom(room));

        if (roomService.allStartConfirmed(room)) {
          await startCountdown(io, room.roomId);
        }

        if (typeof ack === 'function') ack({ success: true, data: serializeRoom(room) });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.PLAYER_READY, async (_payload, ack) => {
      try {
        const room = roomService.confirmStart(user.sub);
        io.to(room.roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, serializeRoom(room));

        if (roomService.allStartConfirmed(room)) {
          await startCountdown(io, room.roomId);
        }

        if (typeof ack === 'function') ack({ success: true, data: serializeRoom(room) });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.REQUEST_RESHUFFLE, (_payload, ack) => {
      try {
        const room = requireEngineRoom(user.sub);
        const phase = room.engine!.getPhase();
        if (phase === 'bidding') {
          room.engine!.requestBidReshuffle(user.sub);
        } else {
          room.engine!.requestReshuffle(user.sub);
        }
        broadcastGame(io, room.roomId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.ACCEPT_RESHUFFLE, (_payload, ack) => {
      try {
        const room = requireEngineRoom(user.sub);
        room.engine!.acceptDeal(user.sub);
        broadcastGame(io, room.roomId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.PLACE_BID, (payload, ack) => {
      try {
        const room = requireEngineRoom(user.sub);
        room.engine!.placeBid(user.sub, Number(payload.bid));
        io.to(room.roomId).emit(SOCKET_EVENTS.BID_PLACED, {
          userId: user.sub,
          bid: Number(payload.bid),
        });
        broadcastGame(io, room.roomId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.PLAY_CARD, (payload, ack) => {
      try {
        const room = requireEngineRoom(user.sub);
        room.engine!.playCard(user.sub, String(payload.cardId));
        broadcastGame(io, room.roomId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.APPROVE_NEXT_ROUND, (_payload, ack) => {
      try {
        const room = requireEngineRoom(user.sub);
        room.engine!.approveNextRound(user.sub);
        if (room.engine!.getPhase() !== 'scoreboard') {
          clearScoreboardTimer(room.roomId);
        }
        broadcastGame(io, room.roomId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.REQUEST_SUSPEND, async (_payload, ack) => {
      try {
        requireEngineRoom(user.sub);
        const live = roomService.requestSuspend(user.sub);
        const suspendApprovals = [...(live.suspendApprovals ?? [])];
        io.to(live.roomId).emit(SOCKET_EVENTS.SUSPEND_UPDATED, {
          suspendApprovals,
          requestedBy: user.sub,
        });
        broadcastGame(io, live.roomId);

        const current = roomService.getLiveRoom(live.roomId);
        if (current) {
          io.to(live.roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, serializeRoom(current));
        }

        if (current && roomService.allSuspendConfirmed(current)) {
          clearScoreboardTimer(live.roomId);
          const { roomId } = await roomService.suspendGame(live.roomId);
          io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { roomId, reason: 'suspended' });
        }

        const ackRoom = roomService.getLiveRoom(live.roomId);
        if (typeof ack === 'function') {
          ack({
            success: true,
            data: ackRoom ? serializeRoom(ackRoom) : serializeRoom(live),
          });
        }
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.SEND_CHAT, (payload, ack) => {
      try {
        const room = roomService.addChat(user.sub, String(payload.message ?? ''));
        const msg = room.chat[room.chat.length - 1];
        io.to(room.roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, msg);
        if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.HEARTBEAT, (_payload, ack) => {
      try {
        roomService.recordActivity(user.sub);
        const room = roomService.getRoomByUser(user.sub);
        room?.engine?.heartbeat(user.sub);
        if (typeof ack === 'function') ack({ success: true, at: Date.now() });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT, async (_payload, ack) => {
      try {
        roomService.bindSocket(user.sub, socket.id);
        const room = roomService.getRoomByUser(user.sub);
        if (!room) {
          if (typeof ack === 'function') ack({ success: false, message: 'No room' });
          return;
        }
        await socket.join(room.roomId);
        const data = emitRoomSession(socket, room, user.sub);
        io.to(room.roomId).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
          userId: user.sub,
          room: serializeRoom(room),
        });
        if (room.phase === 'waiting' && roomService.allStartConfirmed(room)) {
          await startCountdown(io, room.roomId);
        }
        if (typeof ack === 'function') ack({ success: true, data });
      } catch (error) {
        emitError(socket, error, ack);
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId: user.sub, socketId: socket.id });
      const room = roomService.markDisconnected(user.sub, socket.id);
      if (room) {
        io.to(room.roomId).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
          userId: user.sub,
          room: serializeRoom(room),
        });
      }
    });
  });

  startRoomJanitor(io);

  return io;
}

function startRoomJanitor(io: Server): void {
  const idleMs = roomService.getInactivityTtlMs();

  void roomService.purgeAllRooms().then((closed) => {
    if (closed.length > 0) {
      logger.info('Startup room purge', { count: closed.length });
      for (const roomId of closed) {
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { roomId });
      }
    }
  });

  setInterval(() => {
    void roomService.purgeInactiveRooms(idleMs).then((closed) => {
      for (const roomId of closed) {
        io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { roomId });
      }
    });
  }, 60_000);
}

async function startCountdown(io: Server, roomId: string): Promise<void> {
  const existing = roomService.getLiveRoom(roomId);
  if (!existing || existing.phase !== 'waiting') return;
  if (!roomService.allStartConfirmed(existing)) return;
  if (countdownRooms.has(roomId)) return;

  countdownRooms.add(roomId);

  try {
    await roomService.startMatch(roomId);
    const room = roomService.getLiveRoom(roomId);
    if (!room) return;

    let remaining = env.COUNTDOWN_SECONDS;
    countdownRemaining.set(roomId, remaining);
    io.to(roomId).emit(SOCKET_EVENTS.COUNTDOWN, { remaining });
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, serializeRoom(room));

    const timer = setInterval(() => {
      remaining -= 1;
      countdownRemaining.set(roomId, remaining);
      io.to(roomId).emit(SOCKET_EVENTS.COUNTDOWN, { remaining });
      if (remaining <= 0) {
        clearInterval(timer);
        countdownRooms.delete(roomId);
        countdownRemaining.delete(roomId);
        try {
          const live = roomService.beginGameplay(roomId);
          attachEngineBroadcast(io, live.roomId);
          io.to(roomId).emit(SOCKET_EVENTS.GAME_START, serializeRoom(live));
          broadcastGame(io, roomId);
        } catch (error) {
          logger.error('Failed to begin gameplay', { error, roomId });
          io.to(roomId).emit(SOCKET_EVENTS.ERROR, {
            message: 'Failed to start the game. Please leave and rejoin.',
          });
        }
      }
    }, 1000);
  } catch (error) {
    countdownRooms.delete(roomId);
    countdownRemaining.delete(roomId);
    logger.error('Failed to start countdown', { error, roomId });
    io.to(roomId).emit(SOCKET_EVENTS.ERROR, {
      message: 'Failed to start the game. Please try again.',
    });
  }
}

function attachEngineBroadcast(io: Server, roomId: string): void {
  if (engineBroadcastAttached.has(roomId)) return;
  engineBroadcastAttached.add(roomId);

  const room = roomService.getLiveRoom(roomId);
  if (!room?.engine) return;

  room.engine.onEvent((event) => {
    if (event.type === 'shuffle') {
      io.to(roomId).emit(SOCKET_EVENTS.SHUFFLE, event);
    }
    if (event.type === 'reshuffle') {
      io.to(roomId).emit(SOCKET_EVENTS.RESHUFFLE_STATUS, event);
    }
    if (event.type === 'bidding') {
      io.to(roomId).emit(SOCKET_EVENTS.BIDDING_STARTED, {});
    }
    if (event.type === 'playing') {
      io.to(roomId).emit(SOCKET_EVENTS.PLAYING_STARTED, event);
    }
    if (event.type === 'cardPlayed') {
      io.to(roomId).emit(SOCKET_EVENTS.CARD_PLAYED, event.play);
    }
    if (event.type === 'trickEnd') {
      io.to(roomId).emit(SOCKET_EVENTS.END_TRICK, event);
    }
    if (event.type === 'roundScore') {
      io.to(roomId).emit(SOCKET_EVENTS.ROUND_SCORE, event);
      io.to(roomId).emit(SOCKET_EVENTS.SCOREBOARD, event);
      scheduleScoreboardAdvance(io, roomId);
    }
    if (event.type === 'nextRound') {
      clearScoreboardTimer(roomId);
      io.to(roomId).emit(SOCKET_EVENTS.NEXT_ROUND, event);
    }
    if (event.type === 'finished') {
      io.to(roomId).emit(SOCKET_EVENTS.GAME_FINISHED, event);
      broadcastGame(io, roomId);
    }
    if (event.type === 'dealt') {
      broadcastGame(io, roomId);
    }
  });
}

function broadcastGame(io: Server, roomId: string): void {
  const room = roomService.getLiveRoom(roomId);
  if (!room?.engine) return;

  const roomPayload = serializeRoom(room);

  for (const player of room.players) {
    if (!player.socketId) continue;
    const snap = {
      ...room.engine.getPrivateSnapshot(player.userId),
      suspendApprovals: [...(room.suspendApprovals ?? [])],
    };
    io.to(player.socketId).emit(SOCKET_EVENTS.DEAL_CARDS, snap);
    io.to(player.socketId).emit(SOCKET_EVENTS.ROOM_UPDATED, {
      ...roomPayload,
      snapshot: snap,
    });
  }

  io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATED, roomPayload);

  // Auto-proceed reshuffle check shortly if nobody requests
  if (room.engine.getPhase() === 'reshuffle_check') {
    scheduleReshuffleCheckAdvance(io, roomId);
  } else {
    clearReshuffleCheckTimer(roomId);
  }
}

function requireEngineRoom(userId: string) {
  const room = roomService.getRoomByUser(userId);
  if (!room?.engine) throw new Error('Game not in progress');
  return room;
}

function roomPhase(room: NonNullable<ReturnType<typeof roomService.getLiveRoom>>): string {
  if (room.phase === 'countdown') return 'countdown';
  return room.engine?.getPhase() ?? room.phase;
}

function privateSnapshot(
  room: NonNullable<ReturnType<typeof roomService.getLiveRoom>>,
  userId: string,
) {
  if (!room.engine) return undefined;
  return {
    ...room.engine.getPrivateSnapshot(userId),
    suspendApprovals: [...(room.suspendApprovals ?? [])],
  };
}

function serializeRoom(room: NonNullable<ReturnType<typeof roomService.getLiveRoom>>) {
  return {
    id: room.roomId,
    inviteCode: room.inviteCode,
    roomType: room.roomType,
    visibility: room.visibility,
    hostId: room.hostId,
    phase: roomPhase(room),
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      seatIndex: p.seatIndex,
      isReady: p.isReady,
      isConnected: p.isConnected,
    })),
    maxPlayers: room.maxPlayers,
    matchId: room.matchId,
    startApprovals: room.startApprovals,
    suspendApprovals: [...(room.suspendApprovals ?? [])],
    countdownRemaining:
      room.phase === 'countdown' ? (countdownRemaining.get(room.roomId) ?? null) : null,
    publicSnapshot: room.engine?.getPublicSnapshot() ?? null,
    chat: room.chat,
  };
}

function roomSessionForUser(
  room: NonNullable<ReturnType<typeof roomService.getLiveRoom>>,
  userId: string,
) {
  const snapshot = privateSnapshot(room, userId);
  return { ...serializeRoom(room), snapshot };
}

function emitRoomSession(socket: Socket, room: NonNullable<ReturnType<typeof roomService.getLiveRoom>>, userId: string) {
  const payload = roomSessionForUser(room, userId);
  socket.emit(SOCKET_EVENTS.ROOM_UPDATED, payload);
  if (payload.snapshot) {
    socket.emit(SOCKET_EVENTS.DEAL_CARDS, payload.snapshot);
  }
  socket.emit(SOCKET_EVENTS.CHAT_HISTORY, { messages: room.chat });
  return payload;
}

function emitError(socket: Socket, error: unknown, ack?: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  socket.emit(SOCKET_EVENTS.ERROR, { message });
  if (typeof ack === 'function') ack({ success: false, message });
}
