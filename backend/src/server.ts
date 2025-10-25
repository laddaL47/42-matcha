import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

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
auth.post('/register', (_req: any, res: any) => {
  // TODO: validate -> save user -> send verify email
  res.status(501).json({ message: 'Not implemented' });
});
auth.post('/login', (_req: any, res: any) => {
  // TODO: verify user -> issue JWT -> set cookie
  res.status(501).json({ message: 'Not implemented' });
});
auth.post('/logout', (_req: any, res: any) => {
  res.clearCookie('access_token', { path: '/' });
  res.status(204).send();
});
api.use('/auth', auth);

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
