import { UserModel, type IUser } from '../models';
import type { AuthProvider } from '../types';
import type { Types } from 'mongoose';

export class UserRepository {
  async create(data: {
    email?: string;
    username: string;
    passwordHash?: string;
    provider: AuthProvider;
    providerId?: string;
    isGuest?: boolean;
    avatarUrl?: string;
  }): Promise<IUser> {
    return UserModel.create(data);
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  async findByProvider(provider: AuthProvider, providerId: string): Promise<IUser | null> {
    return UserModel.findOne({ provider, providerId });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username });
  }

  async updateUsername(userId: string, username: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, { username }, { new: true });
  }

  async updateAvatar(userId: string, avatarId: number): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, { avatarId }, { new: true });
  }

  async addFriend(userId: Types.ObjectId, friendId: Types.ObjectId): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $addToSet: { friends: friendId } });
  }
}
