import { RoomModel, type IRoom } from '../models';
import type { RoomPhase, RoomType, RoomVisibility } from '../types';
import type { Types } from 'mongoose';

export class RoomRepository {
  async create(data: {
    inviteCode: string;
    roomType: RoomType;
    visibility: RoomVisibility;
    hostId: Types.ObjectId | string;
    maxPlayers: number;
    players: IRoom['players'];
  }): Promise<IRoom> {
    return RoomModel.create({
      ...data,
      phase: 'waiting',
      isActive: true,
    });
  }

  async findById(id: string): Promise<IRoom | null> {
    return RoomModel.findById(id);
  }

  async findByInviteCode(code: string): Promise<IRoom | null> {
    return RoomModel.findOne({ inviteCode: code.toUpperCase(), isActive: true });
  }

  async findPublicWaiting(roomType?: RoomType): Promise<IRoom[]> {
    const filter: Record<string, unknown> = {
      visibility: 'public',
      isActive: true,
      phase: 'waiting',
    };
    if (roomType) filter.roomType = roomType;
    return RoomModel.find(filter).sort({ createdAt: -1 }).limit(50);
  }

  async save(room: IRoom): Promise<IRoom> {
    return room.save();
  }

  async updatePhase(roomId: string, phase: RoomPhase): Promise<void> {
    await RoomModel.findByIdAndUpdate(roomId, { phase });
  }

  async deactivate(roomId: string): Promise<void> {
    await RoomModel.findByIdAndUpdate(roomId, { isActive: false, phase: 'finished' });
  }

  async deactivateAllActive(): Promise<number> {
    const result = await RoomModel.updateMany({ isActive: true }, { isActive: false, phase: 'finished' });
    return result.modifiedCount;
  }
}
