import mongoose, { Schema, Document, Types } from 'mongoose';
import type { RoomType } from '../types';

export interface IMatchPlayer {
  userId: Types.ObjectId;
  username: string;
  seatIndex: number;
  totalScore: number;
  bids: number[];
  tricksWon: number[];
}

export interface IMatchRound {
  roundNumber: number;
  scores: Array<{
    userId: Types.ObjectId;
    bid: number;
    tricksWon: number;
    points: number;
  }>;
}

export interface IMatch extends Document {
  roomId: Types.ObjectId;
  roomType: RoomType;
  players: IMatchPlayer[];
  rounds: IMatchRound[];
  winners: Types.ObjectId[];
  status: 'in_progress' | 'completed' | 'aborted';
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    roomType: { type: Number, enum: [3, 4, 5], required: true },
    players: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        username: { type: String, required: true },
        seatIndex: { type: Number, required: true },
        totalScore: { type: Number, default: 0 },
        bids: [{ type: Number }],
        tricksWon: [{ type: Number }],
      },
    ],
    rounds: [
      {
        roundNumber: Number,
        scores: [
          {
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            bid: Number,
            tricksWon: Number,
            points: Number,
          },
        ],
      },
    ],
    winners: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'aborted'],
      default: 'in_progress',
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

export const MatchModel = mongoose.model<IMatch>('Match', MatchSchema);
