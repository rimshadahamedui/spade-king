import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string;
}

export interface IUserAchievement extends Document {
  userId: Types.ObjectId;
  code: string;
  title: string;
  description: string;
  unlockedAt: Date;
  createdAt: Date;
}

export const ACHIEVEMENT_CATALOG: IAchievementDef[] = [
  { code: 'FIRST_WIN', title: 'First Blood', description: 'Win your first match', icon: 'trophy' },
  { code: 'WIN_STREAK_5', title: 'On Fire', description: 'Win 5 matches in a row', icon: 'fire' },
  { code: 'HIGH_SCORE_100', title: 'Century', description: 'Reach 100 points in a match', icon: 'star' },
  { code: 'GAMES_50', title: 'Regular', description: 'Play 50 matches', icon: 'cards' },
  { code: 'PERFECT_BID', title: 'Precise', description: 'Make bid exactly in a round', icon: 'target' },
];

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

UserAchievementSchema.index({ userId: 1, code: 1 }, { unique: true });

export const UserAchievementModel = mongoose.model<IUserAchievement>(
  'Achievement',
  UserAchievementSchema,
);
