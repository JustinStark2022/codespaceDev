import request from 'supertest';
import { buildTestApp } from '../../test/utils/testServer';
import { signAuthToken, requireAuth } from '../auth.middleware';

describe('auth.middleware', () => {
  const app = buildTestApp();

  test('returns 401 when no auth cookie present', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  test('login sets httpOnly cookie and protected route succeeds', async () => {
    const login = await request(app)
      .post('/login')
      .send({ userId: 42, role: 'user' });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie']?.[0];
    expect(cookie).toMatch(/access_token/);

    const res = await request(app)
      .get('/protected')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(42);
  });

  test('role guard denies non-admin', async () => {
    const login = await request(app)
      .post('/login')
      .send({ userId: 5, role: 'user' });
    const cookie = login.headers['set-cookie']?.[0];
    const res = await request(app)
      .get('/admin-only')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  test('role guard allows admin', async () => {
    const login = await request(app)
      .post('/login')
      .send({ userId: 7, role: 'admin' });
    const cookie = login.headers['set-cookie']?.[0];
    const res = await request(app)
      .get('/admin-only')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  test('token with invalid id yields 401', async () => {
    const bad = signAuthToken({ id: NaN as any, role: 'user' });
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `access_token=${bad}`);
    expect(res.status).toBe(401);
  });

  test('expired token returns 401', async () => {
    const short = signAuthToken({ id: 9, role: 'user' }, { expiresIn: '1ms' });
    await new Promise(r => setTimeout(r, 10));
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `access_token=${short}`);
    expect(res.status).toBe(401);
  });

  test('middleware returns 500 if cookie-parser missing', () => {
    const req: any = { headers: {}, cookies: undefined };
    const res: any = {
      statusCode: 0,
      headers: {},
      status(code: number) { this.statusCode = code; return this; },
      json(payload: any) { this.payload = payload; return this; },
      setHeader(k: string, v: string) { this.headers[k] = v; }
    };
    let calledNext = false;
    requireAuth(req, res, () => { calledNext = true; });
    expect(calledNext).toBe(false);
    expect(res.statusCode).toBe(500);
  });
});
