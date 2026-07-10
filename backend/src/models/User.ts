import mongoose, { Schema, Document, Types } from 'mongoose';
import type { AuthProvider } from '../types';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email?: string;
  username: string;
  passwordHash?: string;
  provider: AuthProvider;
  providerId?: string;
  avatarUrl?: string;
  isGuest: boolean;
  friends: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 24 },
    passwordHash: { type: String },
    provider: {
      type: String,
      enum: ['email', 'google', 'apple', 'guest'],
      required: true,
    },
    providerId: { type: String, index: true },
    avatarUrl: { type: String },
    isGuest: { type: Boolean, default: false },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

UserSchema.index({ provider: 1, providerId: 1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
