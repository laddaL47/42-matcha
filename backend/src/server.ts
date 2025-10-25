import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from './db/pool.js';
import { sendMail } from './email/mailer.js';
import crypto from 'crypto';

const app = express();

// ---- Config ----
const PORT = Number(process.env.PORT) || 3000;
const ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.set('trust proxy', 1); // for secure cookies behind proxy

// ---- Middlewares ----
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
  origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
      // allow no-origin (curl, same-origin) or listed origins
      if (!origin || ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  }),
);
// Security middlewares
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ---- Utilities ----
export function setAuthCookie(
  res: any,
  token: string,
  { maxAgeMs = 1000 * 60 * 15 }: { maxAgeMs?: number } = {},
) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProd, // set true on HTTPS
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
}

// CSRF helpers (double-submit token)
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function setCsrfCookie(res: any, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('csrf_token', token, {
    httpOnly: false, // must be readable by JS to echo into header
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  res.setHeader('X-CSRF-Token', token);
}

// Issue CSRF token cookie on safe requests when user is logged-in
function ensureCsrfToken(req: any, res: any, next: any) {
  const method = String(req.method || 'GET').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  // Only relevant when session cookie is present (protects authenticated actions)
  const hasSession = Boolean(req.cookies?.access_token);
  if (isSafe && hasSession) {
    let token = req.cookies?.csrf_token;
    if (!token) token = generateCsrfToken();
    setCsrfCookie(res, token);
  }
  return next();
}

// Require CSRF for mutating methods if session cookie exists
function requireCsrf(req: any, res: any, next: any) {
  const method = String(req.method || 'GET').toUpperCase();
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  const hasSession = Boolean(req.cookies?.access_token);
  if (!isMutating || !hasSession) return next();

  const cookieTok = req.cookies?.csrf_token;
  const headerTok = req.get('x-csrf-token') || req.get('X-CSRF-Token');
  if (!cookieTok || !headerTok || cookieTok !== headerTok) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  return next();
}

// Attach CSRF middlewares
app.use(ensureCsrfToken);
app.use(requireCsrf);

// ---- Routes ----
const api = express.Router();

api.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Auth skeleton
const auth = express.Router();
const RegisterDto = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(128),
});

const LoginDto = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(8).max(128),
});

auth.post('/register', async (req: any, res: any) => {
  const parsed = RegisterDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, username, password } = parsed.data;

  const pwHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query<{ id: number; email: string; username: string }>(
      `INSERT INTO users(email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username;`,
      [email, username, pwHash],
    );
    const user = rows[0];
    const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET || 'dev', {
      expiresIn: '15m',
    });
    setAuthCookie(res, token);
    res.status(201).json({ user });

    // fire-and-forget: send verification email
    try {
      const vtoken = crypto.randomBytes(24).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h
      await query(
        `INSERT INTO email_verification_tokens(user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, vtoken, expires.toISOString()],
      );
      const verifyUrl = `${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/verify-email?token=${vtoken}`;
      const apiVerifyUrl = `http://localhost:${PORT}/api/auth/verify-email?token=${vtoken}`;
      await sendMail({
        to: user.email,
        subject: 'Verify your email',
        text: `Click to verify: ${apiVerifyUrl}\n(If you have UI) ${verifyUrl}`,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[mail] verification send failed:', e);
    }
  } catch (e: any) {
    if (e?.code === '23505') {
      // unique_violation
      return res.status(409).json({ error: 'Email or username already exists' });
    }
    return res.status(500).json({ error: 'Internal error' });
  }
});

auth.post('/login', async (req: any, res: any) => {
  const parsed = LoginDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { emailOrUsername, password } = parsed.data;

  const { rows } = await query<{ id: number; email: string; username: string; password_hash: string }>(
    `SELECT id, email, username, password_hash FROM users WHERE email = $1 OR username = $1 LIMIT 1;`,
    [emailOrUsername],
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET || 'dev', {
    expiresIn: '15m',
  });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, email: user.email, username: user.username } });
});
auth.post('/logout', (_req: any, res: any) => {
  res.clearCookie('access_token', { path: '/' });
  res.status(204).send();
});
api.use('/auth', auth);

// JWT auth middleware and /me
function requireAuth(req: any, res: any, next: any) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev') as any;
    (req as any).user = { id: Number(payload.sub), username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

api.get('/auth/me', requireAuth, async (req: any, res: any) => {
  const userId = req.user.id;
  const { rows } = await query<{ id: number; email: string; username: string }>(
    `SELECT id, email, username FROM users WHERE id = $1 LIMIT 1;`,
    [userId],
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// Email verification
api.get('/auth/verify-email', async (req: any, res: any) => {
  const token = String(req.query.token || '')
    .trim();
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const { rows } = await query<{ user_id: number; expires_at: string }>(
    `SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) return res.status(400).json({ error: 'Invalid token' });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' });
  await query(`UPDATE users SET email_verified_at = now() WHERE id = $1`, [row.user_id]);
  await query(`DELETE FROM email_verification_tokens WHERE token = $1`, [token]);
  res.json({ ok: true });
});

// Forgot / reset password
const ForgotDto = z.object({ emailOrUsername: z.string().min(1) });
api.post('/auth/forgot-password', async (req: any, res: any) => {
  const parsed = ForgotDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { emailOrUsername } = parsed.data;
  const { rows } = await query<{ id: number; email: string }>(
    `SELECT id, email FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
    [emailOrUsername],
  );
  const user = rows[0];
  // respond 200 regardless to avoid user enumeration
  if (!user) return res.json({ ok: true });
  try {
    const rtoken = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h
    await query(
      `INSERT INTO password_reset_tokens(user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, rtoken, expires.toISOString()],
    );
    const resetUrl = `http://localhost:${PORT}/api/auth/reset-password?token=${rtoken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      text: `To reset your password, POST new password to: ${resetUrl}`,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[mail] reset send failed:', e);
  }
  res.json({ ok: true });
});

const ResetDto = z.object({ token: z.string().min(1), newPassword: z.string().min(8).max(128) });
api.post('/auth/reset-password', async (req: any, res: any) => {
  const parsed = ResetDto.safeParse({ token: req.query.token || req.body?.token, newPassword: req.body?.newPassword });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { token, newPassword } = parsed.data;
  const { rows } = await query<{ user_id: number; expires_at: string; token: string; used_at?: string }>(
    `SELECT user_id, expires_at, token, used_at FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) return res.status(400).json({ error: 'Invalid token' });
  if (row.used_at) return res.status(400).json({ error: 'Token already used' });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' });
  const hash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, row.user_id]);
  await query(`UPDATE password_reset_tokens SET used_at = now() WHERE token = $1`, [token]);
  res.json({ ok: true });
});

app.use('/api', api);

// ---- HTTP + WS ----
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/ws',
  cors: {
    origin: ORIGINS,
    credentials: true,
  },
});

io.on('connection', (socket: any) => {
  // basic handshake
  socket.emit('hello', { message: 'connected' });

  socket.on('ping', () => socket.emit('pong'));

  socket.on('disconnect', (_reason: any) => {
    // optional logging
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
