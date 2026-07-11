import { z } from 'zod';

const emailField = z
  .string()
  .email()
  .transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
  email: emailField,
  password: z.string().min(8).max(128),
  username: z.string().trim().min(2).max(24),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

export const guestSchema = z.object({
  username: z.string().trim().min(2).max(24).optional(),
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
