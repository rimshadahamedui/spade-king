import mongoose, { Schema, Document, Types } from 'mongoose';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export interface ILeaderboardEntry {
  userId: Types.ObjectId;
  username: string;
  score: number;
  gamesWon: number;
  gamesPlayed: number;
  rank: number;
}

export interface ILeaderboard extends Document {
  period: LeaderboardPeriod;
  periodKey: string;
  entries: ILeaderboardEntry[];
  updatedAt: Date;
  createdAt: Date;
}

const LeaderboardSchema = new Schema<ILeaderboard>(
  {
    period: { type: String, enum: ['weekly', 'monthly', 'all_time'], required: true },
    periodKey: { type: String, required: true },
    entries: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        username: { type: String, required: true },
        score: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        rank: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

LeaderboardSchema.index({ period: 1, periodKey: 1 }, { unique: true });

export const LeaderboardModel = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);
