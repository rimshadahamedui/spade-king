import { Response, NextFunction } from 'express';
import { UserModel } from '../models';
import { ADMIN_EMAIL } from '../constants';
import { MatchRepository } from '../repositories/MatchRepository';
import { roomService } from '../services/RoomService';
import { SOCKET_EVENTS } from '../constants';
import { getSocketIo } from '../socket/ioRegistry';
import type { AuthedRequest } from '../middlewares/auth';

const matches = new MatchRepository();

async function assertAdmin(req: AuthedRequest): Promise<void> {
  const doc = await UserModel.findById(req.user!.sub).select('email').lean();
  const email = doc?.email?.trim().toLowerCase();
  if (email !== ADMIN_EMAIL) {
    throw new Error('Forbidden');
  }
}

export class AdminController {
  purgeRooms = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await assertAdmin(req);
      const roomIds = await roomService.purgeAllRooms();
      const io = getSocketIo();
      if (io) {
        for (const roomId of roomIds) {
          io.to(roomId).emit(SOCKET_EVENTS.ROOM_CLOSED, { roomId, reason: 'admin_purge' });
        }
      }
      res.json({ success: true, data: { closed: roomIds.length } });
    } catch (error) {
      next(error);
    }
  };

  clearStats = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await assertAdmin(req);
      const cleared = await matches.clearAllStats();
      res.json({ success: true, data: cleared });
    } catch (error) {
      next(error);
    }
  };
}
