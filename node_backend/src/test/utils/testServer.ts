// src/test/utils/testServer.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  signAuthToken,
  requireAuth,
  requireRole,
  AuthedRequest
} from '../../middleware/auth.middleware';

export function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.post('/login', (req, res) => {
    const { userId, role } = req.body || {};
    if (userId == null) return res.status(400).json({ message: 'userId required' });
    const token = signAuthToken({ id: Number(userId), role });
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    });
    return res.json({ id: Number(userId), role });
  });

  app.get('/protected', requireAuth, (req: AuthedRequest, res) => {
    return res.json({ ok: true, user: req.user });
  });

  app.get('/admin-only', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    return res.json({ ok: true, role: req.user?.role });
  });

  return app;
}
