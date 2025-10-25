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
