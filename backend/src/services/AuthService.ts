import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { env } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { roomService } from './RoomService';
import type { AuthProvider, JwtPayload } from '../types';
import type { IUser } from '../models';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email?: string;
    provider: AuthProvider;
    isGuest: boolean;
    avatarId?: number | null;
  };
}

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly matches = new MatchRepository(),
  ) {}

  async registerEmail(email: string, password: string, username: string): Promise<AuthTokens> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create({
      email: normalizedEmail,
      username: username.trim(),
      passwordHash,
      provider: 'email',
      isGuest: false,
    });
    return this.issueTokens(user);
  }

  async loginEmail(email: string, password: string): Promise<AuthTokens> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user || !user.passwordHash) throw new Error('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error('Invalid credentials');
    return this.issueTokens(user);
  }

  async loginGuest(username?: string): Promise<AuthTokens> {
    const guestName = username?.trim() || `Guest_${randomBytes(3).toString('hex')}`;
    const user = await this.users.create({
      username: guestName.slice(0, 24),
      provider: 'guest',
      providerId: randomBytes(16).toString('hex'),
      isGuest: true,
    });
    return this.issueTokens(user);
  }

  async loginGoogle(providerId: string, email: string, username: string): Promise<AuthTokens> {
    let user = await this.users.findByProvider('google', providerId);
    if (!user) {
      user = await this.users.create({
        email,
        username: username.slice(0, 24),
        provider: 'google',
        providerId,
        isGuest: false,
      });
    }
    return this.issueTokens(user);
  }

  async loginApple(providerId: string, email: string | undefined, username: string): Promise<AuthTokens> {
    let user = await this.users.findByProvider('apple', providerId);
    if (!user) {
      user = await this.users.create({
        email,
        username: username.slice(0, 24),
        provider: 'apple',
        providerId,
        isGuest: false,
      });
    }
    return this.issueTokens(user);
  }

  async updateUsername(userId: string, username: string): Promise<AuthTokens['user']> {
    const trimmed = username.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      throw new Error('Username must be 2–24 characters');
    }

    const existing = await this.users.findById(userId);
    if (!existing) throw new Error('User not found');
    if (existing.isGuest) {
      throw new Error('Guest accounts cannot change display name');
    }
    if (existing.username === trimmed) {
      return this.mapUser(existing);
    }

    const taken = await this.users.findByUsername(trimmed);
    if (taken && taken._id.toString() !== userId) {
      throw new Error('Username already taken');
    }

    const updated = await this.users.updateUsername(userId, trimmed);
    if (!updated) throw new Error('User not found');

    await this.matches.propagateUsername(userId, trimmed);
    roomService.updatePlayerUsername(userId, trimmed);

    return this.mapUser(updated);
  }

  async updateAvatar(userId: string, avatarId: number): Promise<AuthTokens['user']> {
    if (avatarId < 1 || avatarId > 8) {
      throw new Error('Avatar must be between 1 and 8');
    }

    const existing = await this.users.findById(userId);
    if (!existing) throw new Error('User not found');

    const updated = await this.users.updateAvatar(userId, avatarId);
    if (!updated) throw new Error('User not found');

    roomService.updatePlayerAvatar(userId, avatarId);

    return this.mapUser(updated);
  }

  async getProfile(userId: string): Promise<AuthTokens['user']> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('User not found');
    return this.mapUser(user);
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }

  private issueTokens(user: IUser): AuthTokens {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      provider: user.provider,
      isGuest: user.isGuest,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      accessToken,
      refreshToken,
      user: this.mapUser(user),
    };
  }

  private mapUser(user: IUser): AuthTokens['user'] {
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      provider: user.provider,
      isGuest: user.isGuest,
      avatarId: user.avatarId ?? null,
    };
  }
}
