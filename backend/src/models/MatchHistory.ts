import mongoose, { Schema, Document, Types } from 'mongoose';
import type { RoomType } from '../types';

export interface IMatchHistory extends Document {
  matchId: Types.ObjectId;
  userId: Types.ObjectId;
  roomType: RoomType;
  finalScore: number;
  placement: number;
  won: boolean;
  averageBid: number;
  averageTricks: number;
  playedAt: Date;
  createdAt: Date;
}

const MatchHistorySchema = new Schema<IMatchHistory>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomType: { type: Number, enum: [3, 4, 5], required: true },
    finalScore: { type: Number, required: true },
    placement: { type: Number, required: true },
    won: { type: Boolean, required: true },
    averageBid: { type: Number, default: 0 },
    averageTricks: { type: Number, default: 0 },
    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MatchHistorySchema.index({ userId: 1, playedAt: -1 });

export const MatchHistoryModel = mongoose.model<IMatchHistory>('MatchHistory', MatchHistorySchema);
