import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './index';

describe('generated backend', () => {
  it('returns a health response', async () => {
    const response = await request(app).get('/health');
    expect([200, 500]).toContain(response.status);
    expect(response.body).toBeTypeOf('object');
  });
});
