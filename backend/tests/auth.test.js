process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const app = require('../server');

describe('Auth routes', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `test${Date.now()}@example.com`, password: 'password123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `weak${Date.now()}@example.com`, password: 'short' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
