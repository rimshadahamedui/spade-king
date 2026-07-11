import { Response, NextFunction } from 'express';
import { roomService } from '../services/RoomService';
import { MatchRepository } from '../repositories/MatchRepository';
import type { AuthedRequest } from '../middlewares/auth';
import type { RoomType } from '../types';

const matches = new MatchRepository();

export class RoomController {
  create = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user!.isGuest) {
        res.status(403).json({
          success: false,
          message: 'Guest players cannot create rooms. Sign in to host a table.',
        });
        return;
      }
      const room = await roomService.createRoom({
        hostId: req.user!.sub,
        username: req.user!.username,
        roomType: req.body.roomType,
        visibility: req.body.visibility,
        hostIsGuest: req.user!.isGuest,
      });
      res.status(201).json({ success: true, data: this.publicRoom(room) });
    } catch (error) {
      next(error);
    }
  };

  join = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const room = await roomService.joinRoom({
        inviteCode: req.body.inviteCode,
        roomId: req.body.roomId,
        userId: req.user!.sub,
        username: req.user!.username,
      });
      res.json({ success: true, data: this.publicRoom(room) });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roomType = req.query.roomType
        ? (Number(req.query.roomType) as RoomType)
        : undefined;
      const rooms = roomService.listPublicRooms(roomType);
      res.json({
        success: true,
        data: rooms.map((r) => ({
          id: r.id,
          inviteCode: r.inviteCode,
          roomType: r.roomType,
          players: r.players,
          maxPlayers: r.maxPlayers,
          phase: r.phase,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  private publicRoom(room: ReturnType<typeof roomService.getLiveRoom>) {
    if (!room) return null;
    return {
      id: room.roomId,
      inviteCode: room.inviteCode,
      roomType: room.roomType,
      visibility: room.visibility,
      hostId: room.hostId,
      phase: room.phase,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        seatIndex: p.seatIndex,
        isReady: p.isReady,
        isConnected: p.isConnected,
      })),
      maxPlayers: room.maxPlayers,
    };
  }
}

export class StatsController {
  me = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await matches.getStats(req.user!.sub);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  history = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await matches.getHistoryForUser(req.user!.sub);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  };

  leaderboard = async (_req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const board = await matches.getLeaderboardByRoomTypes();
      res.json({ success: true, data: board });
    } catch (error) {
      next(error);
    }
  };

  achievements = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await matches.getAchievements(req.user!.sub);
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  };

  matchDetail = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await matches.getMatchDetailForUser(String(req.params.matchId), req.user!.sub);
      if (!detail) {
        res.status(404).json({ success: false, message: 'Match not found' });
        return;
      }

      const { match, userPlacement, userWon, playedAt } = detail;
      res.json({
        success: true,
        data: {
          matchId: match._id.toString(),
          roomType: match.roomType,
          totalRounds: match.rounds.length,
          playedAt,
          userPlacement,
          userWon,
          winners: match.winners.map((id) => id.toString()),
          players: match.players.map((p) => ({
            userId: p.userId.toString(),
            username: p.username,
            seatIndex: p.seatIndex,
            totalScore: p.totalScore,
          })),
          rounds: match.rounds.map((r) => ({
            roundNumber: r.roundNumber,
            scores: r.scores.map((s) => ({
              userId: s.userId.toString(),
              bid: s.bid,
              tricksWon: s.tricksWon,
              points: s.points,
            })),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
