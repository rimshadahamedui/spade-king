import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AuthService } from '../services/AuthService';
import type { JwtPayload } from '../types';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

const authService = new AuthService();

export function authenticate(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  try {
    req.user = authService.verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = /forbidden/i.test(message)
    ? 403
    : message.toLowerCase().includes('unauthorized')
      ? 401
      : 400;
  res.status(status).json({ success: false, message });
}
