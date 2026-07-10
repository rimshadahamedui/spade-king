import mongoose, { Schema, Document, Types } from 'mongoose';
import type { RoomPhase, RoomType, RoomVisibility } from '../types';

export interface IRoomPlayer {
  userId: Types.ObjectId;
  username: string;
  seatIndex: number;
  isReady: boolean;
  isConnected: boolean;
}

export interface IRoom extends Document {
  inviteCode: string;
  roomType: RoomType;
  visibility: RoomVisibility;
  hostId: Types.ObjectId;
  phase: RoomPhase;
  players: IRoomPlayer[];
  maxPlayers: number;
  matchId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomPlayerSchema = new Schema<IRoomPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    seatIndex: { type: Number, required: true },
    isReady: { type: Boolean, default: false },
    isConnected: { type: Boolean, default: true },
  },
  { _id: false },
);

const RoomSchema = new Schema<IRoom>(
  {
    inviteCode: { type: String, required: true, unique: true, uppercase: true },
    roomType: { type: Number, enum: [3, 4, 5], required: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phase: {
      type: String,
      enum: [
        'waiting',
        'countdown',
        'dealing',
        'reshuffle_check',
        'bidding',
        'playing',
        'trick_end',
        'scoreboard',
        'finished',
      ],
      default: 'waiting',
    },
    players: [RoomPlayerSchema],
    maxPlayers: { type: Number, required: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

RoomSchema.index({ visibility: 1, isActive: 1, phase: 1 });

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
