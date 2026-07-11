import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { RoomController, StatsController } from '../controllers/RoomController';
import { authenticate, validateBody } from '../middlewares/auth';
import {
  appleSchema,
  createRoomSchema,
  googleSchema,
  guestSchema,
  joinRoomSchema,
  loginSchema,
  registerSchema,
} from '../validators/auth';

const authController = new AuthController();
const roomController = new RoomController();
const statsController = new StatsController();

export const authRouter = Router();
authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/guest', validateBody(guestSchema), authController.guest);
authRouter.post('/google', validateBody(googleSchema), authController.google);
authRouter.post('/apple', validateBody(appleSchema), authController.apple);
authRouter.get('/me', authenticate, authController.me);

export const roomRouter = Router();
roomRouter.use(authenticate);
roomRouter.post('/', validateBody(createRoomSchema), roomController.create);
roomRouter.post('/join', validateBody(joinRoomSchema), roomController.join);
roomRouter.get('/public', roomController.list);

export const statsRouter = Router();
statsRouter.use(authenticate);
statsRouter.get('/me', statsController.me);
statsRouter.get('/history', statsController.history);
statsRouter.get('/match/:matchId', statsController.matchDetail);
statsRouter.get('/leaderboard', statsController.leaderboard);
statsRouter.get('/achievements', statsController.achievements);
