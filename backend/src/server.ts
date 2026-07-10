import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { createSocketServer } from './socket';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`R-SPADE API listening on 0.0.0.0:${env.PORT}`, {
      env: env.NODE_ENV,
      prefix: env.API_PREFIX,
      hint: 'Point mobile EXPO_PUBLIC_API_URL to this machine LAN IP (not localhost) on a physical device',
    });
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
