import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { env } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';
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
  };
}

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  async registerEmail(email: string, password: string, username: string): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create({
      email,
      username,
      passwordHash,
      provider: 'email',
      isGuest: false,
    });
    return this.issueTokens(user);
  }

  async loginEmail(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
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
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        provider: user.provider,
        isGuest: user.isGuest,
      },
    };
  }
}
