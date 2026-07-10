import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPlayerStatistics extends Document {
  userId: Types.ObjectId;
  gamesPlayed: number;
  gamesWon: number;
  winPercentage: number;
  totalBids: number;
  bidCount: number;
  averageBid: number;
  totalTricks: number;
  trickCount: number;
  averageTricks: number;
  highestScore: number;
  currentWinStreak: number;
  longestWinStreak: number;
  updatedAt: Date;
  createdAt: Date;
}

const PlayerStatisticsSchema = new Schema<IPlayerStatistics>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    winPercentage: { type: Number, default: 0 },
    totalBids: { type: Number, default: 0 },
    bidCount: { type: Number, default: 0 },
    averageBid: { type: Number, default: 0 },
    totalTricks: { type: Number, default: 0 },
    trickCount: { type: Number, default: 0 },
    averageTricks: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    longestWinStreak: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const PlayerStatisticsModel = mongoose.model<IPlayerStatistics>(
  'PlayerStatistics',
  PlayerStatisticsSchema,
);
