import express from 'express';
import cookieParser from 'cookie-parser';
import { requireAuth, requireRole, signAuthToken } from '@/middleware/auth.middleware';

export function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Simulated login route
  app.post('/login', (req, res) => {
    const { userId = 1, role = 'user' } = req.body || {};
    const token = signAuthToken({ id: userId, role });
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    });
    res.json({ id: userId, role });
  });

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ ok: true, user: (req as any).user });
  });

  app.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => {
    res.json({ ok: true, role: (req as any).user.role });
  });

  return app;
}
