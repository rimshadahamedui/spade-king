import { Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import type { AuthedRequest } from '../middlewares/auth';

const authService = new AuthService();

export class AuthController {
  register = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await authService.registerEmail(
        req.body.email,
        req.body.password,
        req.body.username,
      );
      res.status(201).json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await authService.loginEmail(req.body.email, req.body.password);
      res.json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  };

  guest = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await authService.loginGuest(req.body.username);
      res.status(201).json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  };

  google = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await authService.loginGoogle(
        req.body.providerId,
        req.body.email,
        req.body.username,
      );
      res.json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  };

  apple = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await authService.loginApple(
        req.body.providerId,
        req.body.email,
        req.body.username,
      );
      res.json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.getProfile(req.user!.sub);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.updateUsername(req.user!.sub, req.body.username);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  updateAvatar = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.updateAvatar(req.user!.sub, req.body.avatarId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };
}
