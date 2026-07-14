import { randomBytes } from 'crypto';
import { ROOM_MODE_CONFIG } from '../constants';
import { env } from '../config/env';
import { RoomRepository } from '../repositories/RoomRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { UserRepository } from '../repositories/UserRepository';
import { GameEngine } from '../game';
import type { RoomType, RoomVisibility } from '../types';
import { logger } from '../utils/logger';
import type { Types } from 'mongoose';

export interface LiveRoom {
  roomId: string;
  inviteCode: string;
  roomType: RoomType;
  visibility: RoomVisibility;
  hostId: string;
  phase: string;
  players: Array<{
    userId: string;
    username: string;
    seatIndex: number;
    isReady: boolean;
    isConnected: boolean;
    avatarId?: number;
    socketId?: string;
  }>;
  maxPlayers: number;
  engine: GameEngine | null;
  matchId?: string;
  chat: Array<{ userId: string; username: string; message: string; at: number }>;
  lastActivityAt: number;
  /** Players who tapped Start once the table is full */
  startApprovals: string[];
  /** Players who agreed to suspend/end the game without saving scores */
  suspendApprovals: string[];
  /** Read-only viewers while the table is in progress */
  spectators: Array<{ userId: string; username: string; socketId?: string }>;
}

/**
 * In-memory room registry for realtime gameplay.
 * Mongo is source of truth for lobby persistence; engines live here for speed.
 * Scale-out: back this with Redis adapter + sticky sessions.
 */
export class RoomService {
  private rooms = new Map<string, LiveRoom>();
  private byInvite = new Map<string, string>();
  private userToRoom = new Map<string, string>();
  private spectatorToRoom = new Map<string, string>();

  constructor(
    private readonly roomsRepo = new RoomRepository(),
    private readonly matchesRepo = new MatchRepository(),
    private readonly usersRepo = new UserRepository(),
  ) {}

  getLiveRoom(roomId: string): LiveRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByUser(userId: string): LiveRoom | undefined {
    const id = this.userToRoom.get(userId);
    return id ? this.rooms.get(id) : undefined;
  }

  async createRoom(params: {
    hostId: string;
    username: string;
    roomType: RoomType;
    visibility: RoomVisibility;
    hostIsGuest?: boolean;
  }): Promise<LiveRoom> {
    if (params.hostIsGuest) {
      throw new Error('Guest players cannot create rooms. Sign in to host a table.');
    }
    const config = ROOM_MODE_CONFIG[params.roomType];
    const inviteCode = this.generateInviteCode();

    const hostAvatarId = await this.resolveAvatarId(params.hostId);

    const doc = await this.roomsRepo.create({
      inviteCode,
      roomType: params.roomType,
      visibility: params.visibility,
      hostId: params.hostId,
      maxPlayers: config.playerCount,
      players: [
        {
          userId: params.hostId as unknown as Types.ObjectId,
          username: params.username,
          seatIndex: 0,
          isReady: true,
          isConnected: true,
        },
      ],
    });

    const live: LiveRoom = {
      roomId: doc._id.toString(),
      inviteCode,
      roomType: params.roomType,
      visibility: params.visibility,
      hostId: params.hostId,
      phase: 'waiting',
      players: [
        {
          userId: params.hostId,
          username: params.username,
          seatIndex: 0,
          isReady: true,
          isConnected: true,
          avatarId: hostAvatarId,
        },
      ],
      maxPlayers: config.playerCount,
      engine: null,
      chat: [],
      lastActivityAt: Date.now(),
      startApprovals: [],
      suspendApprovals: [],
      spectators: [],
    };

    this.rooms.set(live.roomId, live);
    this.byInvite.set(inviteCode, live.roomId);
    this.userToRoom.set(params.hostId, live.roomId);
    return live;
  }

  async joinRoom(params: {
    inviteCode?: string;
    roomId?: string;
    userId: string;
    username: string;
  }): Promise<LiveRoom> {
    let live: LiveRoom | undefined;

    if (params.roomId) live = this.rooms.get(params.roomId);
    if (!live && params.inviteCode) {
      const id = this.byInvite.get(params.inviteCode.toUpperCase());
      if (id) live = this.rooms.get(id);
      if (!live) {
        const doc = await this.roomsRepo.findByInviteCode(params.inviteCode);
        if (doc) live = await this.hydrateFromDoc(doc);
      }
    }

    if (!live) throw new Error('Room not found');

    const existingPlayer = live.players.find((p) => p.userId === params.userId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      existingPlayer.username = params.username;
      existingPlayer.avatarId = await this.resolveAvatarId(params.userId);
      this.userToRoom.set(params.userId, live.roomId);
      this.touchActivity(live);
      return live;
    }

    if (live.phase !== 'waiting') throw new Error('Game already started');
    if (live.players.length >= live.maxPlayers) throw new Error('Room is full');
    this.touchActivity(live);

    const existing = this.userToRoom.get(params.userId);
    if (existing && existing !== live.roomId) {
      await this.leaveRoom(params.userId);
    }

    const seatIndex = this.nextSeat(live);
    const avatarId = await this.resolveAvatarId(params.userId);
    live.players.push({
      userId: params.userId,
      username: params.username,
      seatIndex,
      isReady: true,
      isConnected: true,
      avatarId,
    });
    live.startApprovals = [];
    this.sanitizeStartApprovals(live);
    this.userToRoom.set(params.userId, live.roomId);

    const doc = await this.roomsRepo.findById(live.roomId);
    if (doc) {
      doc.players = live.players.map((p) => ({
        userId: p.userId as unknown as Types.ObjectId,
        username: p.username,
        seatIndex: p.seatIndex,
        isReady: p.isReady,
        isConnected: p.isConnected,
      }));
      await this.roomsRepo.save(doc);
    }

    return live;
  }

  async leaveRoom(userId: string): Promise<LiveRoom | null> {
    const live = this.getRoomByUser(userId);
    if (!live) return null;

    this.touchActivity(live);
    live.players = live.players.filter((p) => p.userId !== userId);
    live.startApprovals = live.startApprovals.filter((id) => id !== userId);
    if (live.players.length < live.maxPlayers) {
      live.startApprovals = [];
    }
    this.sanitizeStartApprovals(live);
    this.userToRoom.delete(userId);

    if (live.engine) {
      live.engine.setConnected(userId, false);
    }

    const doc = await this.roomsRepo.findById(live.roomId);
    if (doc) {
      doc.players = live.players.map((p) => ({
        userId: p.userId as unknown as Types.ObjectId,
        username: p.username,
        seatIndex: p.seatIndex,
        isReady: p.isReady,
        isConnected: p.isConnected,
      }));
      if (live.players.length === 0) {
        await this.roomsRepo.deactivate(live.roomId);
      } else {
        if (live.hostId === userId) {
          live.hostId = live.players[0].userId;
          doc.hostId = live.hostId as unknown as Types.ObjectId;
        }
        await this.roomsRepo.save(doc);
      }
    }

    if (live.players.length === 0) {
      this.rooms.delete(live.roomId);
      this.byInvite.delete(live.inviteCode);
      return null;
    }

    if (live.hostId === userId) {
      live.hostId = live.players[0].userId;
    }

    return live;
  }

  /** Host closes the table — removes all players and deactivates the room. */
  async deleteRoom(hostId: string): Promise<{ roomId: string }> {
    const live = this.getRoomByUser(hostId);
    if (!live) throw new Error('Not in a room');
    if (live.hostId !== hostId) throw new Error('Only the host can close this table');
    if (live.phase !== 'waiting' && live.phase !== 'countdown') {
      throw new Error('Cannot close a table while a game is in progress');
    }

    await this.forceCloseRoom(live);
    return { roomId: live.roomId };
  }

  /** Drop every live room from memory and mark all DB rooms inactive. */
  async purgeAllRooms(): Promise<string[]> {
    const lives = [...this.rooms.values()];
    const ids = lives.map((l) => l.roomId);
    for (const live of lives) {
      await this.forceCloseRoom(live, false);
    }
    await this.roomsRepo.deactivateAllActive();
    logger.info('Purged all rooms', { inMemory: ids.length });
    return ids;
  }

  /**
   * Close waiting/countdown rooms with no player activity for longer than maxIdleMs.
   * Returns closed room ids (for socket notifications).
   */
  async purgeInactiveRooms(maxIdleMs: number): Promise<string[]> {
    const now = Date.now();
    const closed: string[] = [];
    for (const live of [...this.rooms.values()]) {
      if (live.phase !== 'waiting' && live.phase !== 'countdown') continue;
      if (now - live.lastActivityAt <= maxIdleMs) continue;
      await this.forceCloseRoom(live);
      closed.push(live.roomId);
    }
    if (closed.length > 0) {
      logger.info('Closed inactive rooms', { count: closed.length, maxIdleMs });
    }
    return closed;
  }

  recordActivity(userId: string): void {
    const live = this.getRoomByUser(userId);
    if (live) this.touchActivity(live);
  }

  /** Player tapped Start once the table is full. */
  confirmStart(userId: string): LiveRoom {
    const live = this.getRoomByUser(userId);
    if (!live) throw new Error('Not in a room');
    const player = live.players.find((p) => p.userId === userId);
    if (!player) throw new Error('Player not found');

    if (live.startApprovals.includes(userId)) return live;

    if (live.phase !== 'waiting') return live;

    if (live.players.length < live.maxPlayers) {
      throw new Error('Waiting for all players to join');
    }

    live.startApprovals.push(userId);
    this.sanitizeStartApprovals(live);
    this.touchActivity(live);
    return live;
  }

  isRoomFull(live: LiveRoom): boolean {
    return live.players.length === live.maxPlayers;
  }

  allStartConfirmed(live: LiveRoom): boolean {
    return (
      this.isRoomFull(live) &&
      live.players.every((p) => live.startApprovals.includes(p.userId))
    );
  }

  /** @deprecated Lobby players are always ready; use confirmStart */
  setReady(userId: string, ready: boolean): LiveRoom {
    if (ready) return this.confirmStart(userId);
    const live = this.getRoomByUser(userId);
    if (!live) throw new Error('Not in a room');
    return live;
  }

  allReady(live: LiveRoom): boolean {
    return this.allStartConfirmed(live);
  }

  async startMatch(roomId: string): Promise<LiveRoom> {
    const live = this.rooms.get(roomId);
    if (!live) throw new Error('Room not found');
    if (live.phase !== 'waiting') throw new Error('Match already starting');
    if (!this.allStartConfirmed(live)) throw new Error('Not all players confirmed start');

    const match = await this.matchesRepo.create({
      roomId: live.roomId,
      roomType: live.roomType,
      players: live.players.map((p) => ({
        userId: p.userId as unknown as Types.ObjectId,
        username: p.username,
        seatIndex: p.seatIndex,
        totalScore: 0,
        bids: [],
        tricksWon: [],
      })),
    });

    live.matchId = match._id.toString();
    live.phase = 'countdown';
    live.suspendApprovals = [];
    this.touchActivity(live);

    const engine = new GameEngine({
      roomId: live.roomId,
      roomType: live.roomType,
      players: live.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        seatIndex: p.seatIndex,
        avatarId: p.avatarId,
      })),
      shufflerSeatIndex: 0,
    });

    engine.onEvent(async (event) => {
      if (event.type === 'finished') {
        live.phase = 'finished';
        await this.persistFinishedMatch(live, event.winners, event.totals);
      }
      if (event.type === 'phase') {
        live.phase = event.phase;
      }
    });

    live.engine = engine;
    return live;
  }

  beginGameplay(roomId: string): LiveRoom {
    const live = this.rooms.get(roomId);
    if (!live?.engine) throw new Error('Engine not ready');
    live.engine.startGame();
    live.phase = live.engine.getPhase();
    live.suspendApprovals = [];
    this.touchActivity(live);
    return live;
  }

  /** Player votes to suspend the game — if all agree, match is aborted with no scores saved. */
  requestSuspend(userId: string): LiveRoom {
    const live = this.getRoomByUser(userId);
    if (!live) throw new Error('Not in a room');
    if (!live.engine) throw new Error('Game not in progress');

    const phase = live.engine.getPhase();
    if (phase === 'waiting' || phase === 'countdown' || phase === 'finished') {
      throw new Error('Game not in progress');
    }

    const player = live.players.find((p) => p.userId === userId);
    if (!player) throw new Error('Player not found');

    if (!live.suspendApprovals) live.suspendApprovals = [];

    if (!live.suspendApprovals.includes(userId)) {
      live.suspendApprovals.push(userId);
      this.touchActivity(live);
    }

    return live;
  }

  allSuspendConfirmed(live: LiveRoom): boolean {
    return (
      live.engine !== null &&
      live.players.length > 0 &&
      live.players.every((p) => live.suspendApprovals.includes(p.userId))
    );
  }

  /** Abort match in DB and tear down the live room. */
  async suspendGame(roomId: string): Promise<{ roomId: string }> {
    const live = this.rooms.get(roomId);
    if (!live) throw new Error('Room not found');

    if (live.matchId) {
      await this.matchesRepo.abort(live.matchId);
    }

    const closedId = live.roomId;
    await this.forceCloseRoom(live);
    return { roomId: closedId };
  }

  addChat(userId: string, message: string): LiveRoom {
    const live = this.getRoomByUser(userId);
    if (!live) throw new Error('Not in a room');
    const player = live.players.find((p) => p.userId === userId);
    if (!player) throw new Error('Player not found');
    const trimmed = message.trim().slice(0, 300);
    if (!trimmed) throw new Error('Empty message');
    live.chat.push({
      userId,
      username: player.username,
      message: trimmed,
      at: Date.now(),
    });
    if (live.chat.length > 100) live.chat.shift();
    this.touchActivity(live);
    return live;
  }

  bindSocket(userId: string, socketId: string): void {
    const live = this.getRoomByUser(userId);
    if (!live) return;
    const player = live.players.find((p) => p.userId === userId);
    if (player) {
      player.socketId = socketId;
      player.isConnected = true;
    }
    live.engine?.setConnected(userId, true);
    this.touchActivity(live);
  }

  markDisconnected(userId: string, socketId: string): LiveRoom | null {
    const live = this.getRoomByUser(userId);
    if (!live) return null;
    const player = live.players.find((p) => p.userId === userId);
    if (!player) return live;

    // Ignore stale disconnects after a newer socket has already bound.
    if (player.socketId && player.socketId !== socketId) {
      return live;
    }

    player.isConnected = false;
    player.socketId = undefined;
    live.engine?.setConnected(userId, false);
    return live;
  }

  getRoomBySpectator(userId: string): LiveRoom | undefined {
    const id = this.spectatorToRoom.get(userId);
    return id ? this.rooms.get(id) : undefined;
  }

  updatePlayerAvatar(userId: string, avatarId: number): void {
    for (const live of this.rooms.values()) {
      const player = live.players.find((p) => p.userId === userId);
      if (player) player.avatarId = avatarId;
      live.engine?.updatePlayerAvatar(userId, avatarId);
    }
  }

  updatePlayerUsername(userId: string, username: string): void {
    for (const live of this.rooms.values()) {
      const player = live.players.find((p) => p.userId === userId);
      if (player) player.username = username;
      const spectator = live.spectators.find((s) => s.userId === userId);
      if (spectator) spectator.username = username;
      live.engine?.updatePlayerUsername(userId, username);
    }
  }

  private isWatchablePhase(live: LiveRoom): boolean {
    const phase = live.phase === 'countdown' ? 'countdown' : (live.engine?.getPhase() ?? live.phase);
    return phase !== 'waiting' && phase !== 'countdown' && phase !== 'finished';
  }

  async watchRoom(params: {
    inviteCode?: string;
    roomId?: string;
    userId: string;
    username: string;
  }): Promise<LiveRoom> {
    let live: LiveRoom | undefined;
    if (params.roomId) live = this.rooms.get(params.roomId);
    if (!live && params.inviteCode) {
      const id = this.byInvite.get(params.inviteCode.toUpperCase());
      if (id) live = this.rooms.get(id);
    }
    if (!live) throw new Error('Room not found');

    const asPlayer = live.players.find((p) => p.userId === params.userId);
    if (asPlayer) {
      asPlayer.username = params.username;
      asPlayer.isConnected = true;
      this.userToRoom.set(params.userId, live.roomId);
      this.spectatorToRoom.delete(params.userId);
      return live;
    }

    if (!this.isWatchablePhase(live)) {
      throw new Error('This table is not in progress');
    }
    if (live.players.length < live.maxPlayers) {
      throw new Error('Table is not full yet — you can still join as a player');
    }

    const otherRoom = this.userToRoom.get(params.userId);
    if (otherRoom && otherRoom !== live.roomId) {
      await this.leaveRoom(params.userId);
    }
    await this.leaveWatch(params.userId);

    let spectator = live.spectators.find((s) => s.userId === params.userId);
    if (!spectator) {
      spectator = { userId: params.userId, username: params.username };
      live.spectators.push(spectator);
    } else {
      spectator.username = params.username;
    }
    this.spectatorToRoom.set(params.userId, live.roomId);
    this.touchActivity(live);
    return live;
  }

  async leaveWatch(userId: string): Promise<LiveRoom | null> {
    const live = this.getRoomBySpectator(userId);
    if (!live) return null;
    live.spectators = live.spectators.filter((s) => s.userId !== userId);
    this.spectatorToRoom.delete(userId);
    return live;
  }

  bindSpectatorSocket(userId: string, socketId: string): void {
    const live = this.getRoomBySpectator(userId);
    if (!live) return;
    const spectator = live.spectators.find((s) => s.userId === userId);
    if (spectator) spectator.socketId = socketId;
  }

  markSpectatorDisconnected(userId: string, socketId: string): LiveRoom | null {
    const live = this.getRoomBySpectator(userId);
    if (!live) return null;
    const spectator = live.spectators.find((s) => s.userId === userId);
    if (!spectator) return live;
    if (spectator.socketId && spectator.socketId !== socketId) return live;
    live.spectators = live.spectators.filter((s) => s.userId !== userId);
    this.spectatorToRoom.delete(userId);
    return live;
  }

  async teardownFinishedRoom(roomId: string): Promise<string | null> {
    const live = this.rooms.get(roomId);
    if (!live) return null;
    const phase = live.engine?.getPhase() ?? live.phase;
    if (phase !== 'finished' && live.phase !== 'finished') return null;
    await this.forceCloseRoom(live);
    return roomId;
  }

  listPublicRooms(roomType?: RoomType) {
    return Array.from(this.rooms.values())
      .filter(
        (r) =>
          r.visibility === 'public' &&
          r.players.length > 0 &&
          r.phase !== 'finished' &&
          (!roomType || r.roomType === roomType),
      )
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      .map((r) => {
        const phase = r.phase === 'countdown' ? 'countdown' : (r.engine?.getPhase() ?? r.phase);
        const status =
          phase === 'waiting' ? 'open' : phase === 'countdown' ? 'starting' : 'playing';
        return {
          id: r.roomId,
          inviteCode: r.inviteCode,
          roomType: r.roomType,
          players: r.players.length,
          maxPlayers: r.maxPlayers,
          phase,
          status,
        };
      });
  }

  /** All in-memory tables — admin monitoring. */
  listAllLiveRooms() {
    return Array.from(this.rooms.values())
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      .map((r) => ({
        id: r.roomId,
        inviteCode: r.inviteCode,
        roomType: r.roomType,
        visibility: r.visibility,
        phase: r.phase === 'countdown' ? 'countdown' : (r.engine?.getPhase() ?? r.phase),
        players: r.players.length,
        maxPlayers: r.maxPlayers,
        playerNames: r.players.map((p) => p.username),
        hostId: r.hostId,
      }));
  }

  /** Force-close any live table (lobby or in-progress). */
  async adminCloseRoom(roomId: string): Promise<string | null> {
    const live = this.rooms.get(roomId);
    if (!live) return null;

    if (live.matchId && live.engine) {
      const phase = live.engine.getPhase();
      if (phase !== 'waiting' && phase !== 'countdown' && phase !== 'finished') {
        await this.matchesRepo.abort(live.matchId);
      }
    }

    const closedId = live.roomId;
    await this.forceCloseRoom(live);
    return closedId;
  }

  getInactivityTtlMs(): number {
    return env.ROOM_IDLE_TTL_SECONDS * 1000;
  }

  private async resolveAvatarId(userId: string): Promise<number | undefined> {
    const user = await this.usersRepo.findById(userId);
    return user?.avatarId ?? undefined;
  }

  private sanitizeStartApprovals(live: LiveRoom): void {
    const seated = new Set(live.players.map((p) => p.userId));
    live.startApprovals = live.startApprovals.filter((id) => seated.has(id));
  }

  private touchActivity(live: LiveRoom): void {
    live.lastActivityAt = Date.now();
  }

  private async forceCloseRoom(live: LiveRoom, deactivateDb = true): Promise<void> {
    for (const player of live.players) {
      this.userToRoom.delete(player.userId);
    }
    for (const spectator of live.spectators) {
      this.spectatorToRoom.delete(spectator.userId);
    }
    live.spectators = [];
    this.rooms.delete(live.roomId);
    this.byInvite.delete(live.inviteCode);
    if (deactivateDb) {
      await this.roomsRepo.deactivate(live.roomId);
    }
  }

  private async persistFinishedMatch(
    live: LiveRoom,
    winners: string[],
    totals: Record<string, number>,
  ): Promise<void> {
    if (!live.matchId || !live.engine) return;
    try {
      const players = live.engine.getPlayers();
      const ranked = [...players].sort((a, b) => b.totalScore - a.totalScore);

      const publicSnap = live.engine.getPublicSnapshot();
      const rounds = (publicSnap.scoreHistory ?? []).map((entry) => ({
        roundNumber: entry.round,
        scores: entry.scores.map((s) => ({
          userId: s.userId as unknown as Types.ObjectId,
          bid: s.bid,
          tricksWon: s.tricksWon,
          points: s.points,
        })),
      }));

      const matchPlayers = players.map((p) => {
        const bids: number[] = [];
        const tricksWon: number[] = [];
        for (const entry of publicSnap.scoreHistory ?? []) {
          const row = entry.scores.find((s) => s.userId === p.userId);
          if (row) {
            bids.push(row.bid);
            tricksWon.push(row.tricksWon);
          }
        }
        return {
          userId: p.userId as unknown as Types.ObjectId,
          username: p.username,
          seatIndex: p.seatIndex,
          totalScore: p.totalScore,
          bids,
          tricksWon,
        };
      });

      await this.matchesRepo.complete(live.matchId, winners, matchPlayers, rounds);

      const history = ranked.map((p, idx) => ({
        matchId: live.matchId!,
        userId: p.userId,
        roomType: live.roomType,
        finalScore: totals[p.userId] ?? p.totalScore,
        placement: idx + 1,
        won: winners.includes(p.userId),
        averageBid: p.bid ?? 0,
        averageTricks: p.tricksWon,
      }));
      await this.matchesRepo.addHistoryEntries(history);

      for (const p of ranked) {
        await this.matchesRepo.upsertStats(p.userId, {
          won: winners.includes(p.userId),
          finalScore: totals[p.userId] ?? p.totalScore,
          bids: p.bid !== null ? [p.bid] : [],
          tricks: [p.tricksWon],
        });
      }

      await this.roomsRepo.deactivate(live.roomId);
      live.phase = 'finished';
    } catch (error) {
      logger.error('Failed to persist match', { error, roomId: live.roomId });
    }
  }

  private async hydrateFromDoc(doc: Awaited<ReturnType<RoomRepository['findById']>>): Promise<LiveRoom> {
    if (!doc) throw new Error('Room not found');
    const live: LiveRoom = {
      roomId: doc._id.toString(),
      inviteCode: doc.inviteCode,
      roomType: doc.roomType,
      visibility: doc.visibility,
      hostId: doc.hostId.toString(),
      phase: doc.phase,
      players: doc.players.map((p: { userId: { toString(): string }; username: string; seatIndex: number; isReady: boolean; isConnected: boolean }) => ({
        userId: p.userId.toString(),
        username: p.username,
        seatIndex: p.seatIndex,
        isReady: p.isReady,
        isConnected: p.isConnected,
      })),
      maxPlayers: doc.maxPlayers,
      engine: null,
      matchId: doc.matchId?.toString(),
      chat: [],
      lastActivityAt: Date.now(),
      startApprovals: [],
      suspendApprovals: [],
      spectators: [],
    };
    this.rooms.set(live.roomId, live);
    this.byInvite.set(live.inviteCode, live.roomId);
    for (const p of live.players) this.userToRoom.set(p.userId, live.roomId);
    return live;
  }

  private nextSeat(live: LiveRoom): number {
    const used = new Set(live.players.map((p) => p.seatIndex));
    for (let i = 0; i < live.maxPlayers; i += 1) {
      if (!used.has(i)) return i;
    }
    throw new Error('No seats available');
  }

  private generateInviteCode(): string {
    return randomBytes(3).toString('hex').toUpperCase();
  }
}

/** Singleton for the process (Socket + HTTP share it). */
export const roomService = new RoomService();
