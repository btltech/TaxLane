process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const app = require('../server');

describe('HMRC obligations flow', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `hmrc${Date.now()}@example.com`, password: 'password123' });
    token = res.body.accessToken;
    expect(token).toBeDefined();
  });

  it('generates obligations and updates status after submission', async () => {
    const obligationsRes = await request(app)
      .get('/api/hmrc/obligations')
      .set('Authorization', `Bearer ${token}`);
    expect(obligationsRes.status).toBe(200);
    expect(Array.isArray(obligationsRes.body)).toBe(true);
    expect(obligationsRes.body.length).toBeGreaterThan(0);

    const target = obligationsRes.body.find((o) => o.status !== 'fulfilled') || obligationsRes.body[0];
    expect(target).toBeDefined();

    await request(app)
      .post('/api/hmrc/mock-connect')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .post('/api/hmrc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'quarterly',
        period: target.periodKey,
        payload: { income: 10, expenses: 5 },
      })
      .expect(200);

    const updated = await request(app)
      .get('/api/hmrc/obligations')
      .set('Authorization', `Bearer ${token}`);
    const after = updated.body.find((o) => o.periodKey === target.periodKey);
    expect(after.status).toBe('fulfilled');
  });
});
