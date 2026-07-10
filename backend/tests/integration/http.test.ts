import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

/**
 * HTTP smoke tests that do not require Mongo (auth endpoints will fail without DB).
 * Health is always available.
 */
describe('HTTP API', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('r-spade');
  });

  it('rejects unauthenticated room list', async () => {
    const res = await request(app).get('/api/v1/rooms/public');
    expect(res.status).toBe(401);
  });
});
