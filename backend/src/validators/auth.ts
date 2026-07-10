import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  username: z.string().min(2).max(24),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const guestSchema = z.object({
  username: z.string().min(2).max(24).optional(),
});

export const googleSchema = z.object({
  providerId: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(2).max(24),
});

export const appleSchema = z.object({
  providerId: z.string().min(1),
  email: z.string().email().optional(),
  username: z.string().min(2).max(24),
});

export const createRoomSchema = z.object({
  roomType: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const joinRoomSchema = z.object({
  inviteCode: z.string().min(4).max(12).optional(),
  roomId: z.string().optional(),
}).refine((d) => d.inviteCode || d.roomId, {
  message: 'inviteCode or roomId required',
});
