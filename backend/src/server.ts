import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, pool } from './db/pool.js';
import { sendMail } from './email/mailer.js';
import crypto from 'crypto';
import { AppError, badRequest, conflict, forbidden, internal, unauthorized, notFound } from './errors.js';
import multer from 'multer';
import sharp from 'sharp';

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
      return cb(new AppError('CORS_ORIGIN_NOT_ALLOWED', 403, 'CORS: origin not allowed'));
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
    return next(forbidden('CSRF_INVALID', 'Invalid CSRF token'));
  }
  return next();
}

// Attach CSRF middlewares
app.use(ensureCsrfToken);
app.use(requireCsrf);

// ---- Static uploads ----
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_ROOT, { maxAge: '7d', extensions: ['jpg', 'jpeg', 'png', 'webp'] }));

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

auth.post('/register', async (req: any, res: any, next: any) => {
  const parsed = RegisterDto.safeParse(req.body);
  if (!parsed.success) return next(badRequest('VALIDATION_ERROR', 'Invalid request', parsed.error.flatten()));
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
      return next(conflict('USER_ALREADY_EXISTS', 'Email or username already exists'));
    }
    return next(internal());
  }
});

auth.post('/login', async (req: any, res: any, next: any) => {
  const parsed = LoginDto.safeParse(req.body);
  if (!parsed.success) return next(badRequest('VALIDATION_ERROR', 'Invalid request', parsed.error.flatten()));
  const { emailOrUsername, password } = parsed.data;

  const { rows } = await query<{ id: number; email: string; username: string; password_hash: string }>(
    `SELECT id, email, username, password_hash FROM users WHERE email = $1 OR username = $1 LIMIT 1;`,
    [emailOrUsername],
  );
  const user = rows[0];
  if (!user) return next(unauthorized('INVALID_CREDENTIALS', 'Invalid credentials'));

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return next(unauthorized('INVALID_CREDENTIALS', 'Invalid credentials'));

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
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev') as any;
    (req as any).user = { id: Number(payload.sub), username: payload.username };
    return next();
  } catch {
    return next(unauthorized());
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
  const { rows: arows } = await query<{ storage_key: string }>(
    `SELECT storage_key FROM photos WHERE user_id = $1 AND kind = 'avatar' LIMIT 1`,
    [userId],
  );
  const akey = arows[0]?.storage_key;
  const avatar = akey
    ? { url: publicUrl(akey), thumbUrl: publicUrl(akey.replace(/\.(\w+)$/, '_thumb.$1')) }
    : null;
  res.json({ user: { ...user }, avatar });
});

// ---- Profile CRUD ----
const GenderEnum = z.enum(['male', 'female', 'other']);
const SexualPrefEnum = z.enum(['straight', 'gay', 'bisexual', 'other']);

const ProfilePatchDto = z.object({
  displayName: z.string().min(0).max(100).optional(),
  gender: GenderEnum.optional(),
  sexualPref: SexualPrefEnum.optional(),
  bio: z.string().min(0).max(500).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  fameRating: z.number().min(0).max(100).optional(),
});

api.get('/me/profile', requireAuth, async (req: any, res: any) => {
  const userId = req.user.id;
  const { rows } = await query<{
    user_id: number;
    display_name: string;
    gender: string | null;
    sexual_pref: string | null;
    bio: string;
    birthdate: string | null;
    fame_rating: number;
  }>(`SELECT user_id, display_name, gender, sexual_pref, bio, birthdate, fame_rating FROM profiles WHERE user_id = $1 LIMIT 1`, [
    userId,
  ]);
  const row = rows[0];
  const profile = row
    ? {
        userId: row.user_id,
        displayName: row.display_name,
        gender: row.gender,
        sexualPref: row.sexual_pref,
        bio: row.bio,
        birthdate: row.birthdate,
        fameRating: row.fame_rating,
      }
    : {
        userId,
        displayName: '',
        gender: null,
        sexualPref: null,
        bio: '',
        birthdate: null,
        fameRating: 0,
      };
  res.json({ profile });
});

api.patch('/me/profile', requireAuth, async (req: any, res: any, next: any) => {
  const parsed = ProfilePatchDto.safeParse(req.body || {});
  if (!parsed.success) return next(badRequest('VALIDATION_ERROR', 'Invalid request', parsed.error.flatten()));
  const { displayName, gender, sexualPref, bio, birthdate, fameRating } = parsed.data;
  const userId = req.user.id;

  // Build dynamic sets for upsert
  const fields: string[] = [];
  const values: any[] = [];
  function push(_field: string, dbName: string, value: any) {
    fields.push(dbName);
    values.push(value);
  }
  if (displayName !== undefined) push('displayName', 'display_name', displayName);
  if (gender !== undefined) push('gender', 'gender', gender);
  if (sexualPref !== undefined) push('sexualPref', 'sexual_pref', sexualPref);
  if (bio !== undefined) push('bio', 'bio', bio);
  if (birthdate !== undefined) push('birthdate', 'birthdate', birthdate);
  if (fameRating !== undefined) push('fameRating', 'fame_rating', fameRating);

  // If no fields provided, just return current profile
  if (fields.length === 0) {
    const { rows } = await query<{
      user_id: number;
      display_name: string;
      gender: string | null;
      sexual_pref: string | null;
      bio: string;
      birthdate: string | null;
      fame_rating: number;
    }>(`SELECT user_id, display_name, gender, sexual_pref, bio, birthdate, fame_rating FROM profiles WHERE user_id = $1 LIMIT 1`, [
      userId,
    ]);
    const row = rows[0];
    const profile = row
      ? {
          userId: row.user_id,
          displayName: row.display_name,
          gender: row.gender,
          sexualPref: row.sexual_pref,
          bio: row.bio,
          birthdate: row.birthdate,
          fameRating: row.fame_rating,
        }
      : { userId, displayName: '', gender: null, sexualPref: null, bio: '', birthdate: null, fameRating: 0 };
    return res.json({ profile });
  }

  // Construct upsert
  const insertCols = ['user_id', ...fields];
  const insertParams = ['$1', ...fields.map((_, idx) => `$${idx + 2}`)];
  const updates = fields.map((c) => `${c} = EXCLUDED.${c}`).join(', ');

  const sql = `INSERT INTO profiles(${insertCols.join(', ')})
               VALUES (${insertParams.join(', ')})
               ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = now()
               RETURNING user_id, display_name, gender, sexual_pref, bio, birthdate, fame_rating`;
  const params = [userId, ...values];
  try {
    const { rows } = await query<{
      user_id: number;
      display_name: string;
      gender: string | null;
      sexual_pref: string | null;
      bio: string;
      birthdate: string | null;
      fame_rating: number;
    }>(sql, params);
    const r = rows[0];
    const profile = {
      userId: r.user_id,
      displayName: r.display_name,
      gender: r.gender,
      sexualPref: r.sexual_pref,
      bio: r.bio,
      birthdate: r.birthdate,
      fameRating: r.fame_rating,
    };
    res.json({ profile });
  } catch (e: any) {
    if (e?.code === '23514') {
      return next(badRequest('CONSTRAINT_VIOLATION', 'Invalid value'));
    }
    return next(internal());
  }
});

// Public profile by username (no email)
api.get('/users/:username', async (req: any, res: any, next: any) => {
  const username = String(req.params.username || '').trim();
  if (!username) return next(badRequest('VALIDATION_ERROR', 'Invalid username'));
  const { rows } = await query<{
    id: number;
    username: string;
    display_name: string;
    gender: string | null;
    sexual_pref: string | null;
    bio: string;
    birthdate: string | null;
    fame_rating: number;
    avatar_key: string | null;
  }>(
    `SELECT u.id, u.username, p.display_name, p.gender, p.sexual_pref, p.bio, p.birthdate, p.fame_rating,
            (SELECT storage_key FROM photos WHERE user_id = u.id AND kind = 'avatar' LIMIT 1) AS avatar_key
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.username = $1
     LIMIT 1`,
    [username],
  );
  const row = rows[0];
  if (!row) return next(notFound('USER_NOT_FOUND', 'User not found'));
  const profile = {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? '',
    gender: row.gender,
    sexualPref: row.sexual_pref,
    bio: row.bio ?? '',
    birthdate: row.birthdate,
    fameRating: row.fame_rating ?? 0,
  };
  const avatar = row.avatar_key
    ? { url: publicUrl(row.avatar_key), thumbUrl: publicUrl(row.avatar_key.replace(/\.(\w+)$/, '_thumb.$1')) }
    : null;
  res.json({ profile, avatar });
});

// Email verification
api.get('/auth/verify-email', async (req: any, res: any, next: any) => {
  const token = String(req.query.token || '')
    .trim();
  if (!token) return next(badRequest('MISSING_TOKEN', 'Missing token'));
  const { rows } = await query<{ user_id: number; expires_at: string }>(
    `SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) return next(badRequest('INVALID_TOKEN', 'Invalid token'));
  if (new Date(row.expires_at).getTime() < Date.now()) return next(badRequest('TOKEN_EXPIRED', 'Token expired'));
  await query(`UPDATE users SET email_verified_at = now() WHERE id = $1`, [row.user_id]);
  await query(`DELETE FROM email_verification_tokens WHERE token = $1`, [token]);
  res.json({ ok: true });
});

// Forgot / reset password
const ForgotDto = z.object({ emailOrUsername: z.string().min(1) });
api.post('/auth/forgot-password', async (req: any, res: any, next: any) => {
  const parsed = ForgotDto.safeParse(req.body);
  if (!parsed.success) return next(badRequest('VALIDATION_ERROR', 'Invalid request', parsed.error.flatten()));
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
api.post('/auth/reset-password', async (req: any, res: any, next: any) => {
  const parsed = ResetDto.safeParse({ token: req.query.token || req.body?.token, newPassword: req.body?.newPassword });
  if (!parsed.success) return next(badRequest('VALIDATION_ERROR', 'Invalid request', parsed.error.flatten()));
  const { token, newPassword } = parsed.data;
  const { rows } = await query<{ user_id: number; expires_at: string; token: string; used_at?: string }>(
    `SELECT user_id, expires_at, token, used_at FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) return next(badRequest('INVALID_TOKEN', 'Invalid token'));
  if (row.used_at) return next(badRequest('TOKEN_ALREADY_USED', 'Token already used'));
  if (new Date(row.expires_at).getTime() < Date.now()) return next(badRequest('TOKEN_EXPIRED', 'Token expired'));
  const hash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, row.user_id]);
  await query(`UPDATE password_reset_tokens SET used_at = now() WHERE token = $1`, [token]);
  res.json({ ok: true });
});

app.use('/api', api);

// ---- Photos: helpers ----
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function ensureUserDir(userId: number) {
  const dir = path.join(UPLOADS_ROOT, 'u', String(userId));
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function publicUrl(storageKey: string) {
  return `/uploads/${storageKey}`;
}

// ---- Photos: GET list ----
api.get('/me/photos', requireAuth, async (req: any, res: any) => {
  const userId = req.user.id;
  const { rows } = await query<any>(
    `SELECT id, kind, position, storage_key, mime_type, width, height, size_bytes
     FROM photos WHERE user_id = $1 ORDER BY kind ASC, position ASC NULLS FIRST`,
    [userId],
  );
  const avatar = rows.find((r: any) => r.kind === 'avatar') || null;
  const gallery = rows.filter((r: any) => r.kind === 'gallery');
  const map = (r: any) => ({ ...r, url: publicUrl(r.storage_key), thumbUrl: publicUrl(r.storage_key.replace(/\.(\w+)$/, '_thumb.$1')) });
  res.json({
    avatar: avatar ? map(avatar) : null,
    gallery: gallery.map(map),
  });
});

// ---- Photos: POST avatar ----
api.post('/me/avatar', requireAuth, upload.single('file'), async (req: any, res: any, next: any) => {
  const userId = req.user.id;
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return next(badRequest('NO_FILE', 'No file uploaded'));
  if (!ALLOWED_MIME.has(file.mimetype)) return next(badRequest('UNSUPPORTED_TYPE', 'Unsupported image type'));
  try {
    const dir = await ensureUserDir(userId);
    const ext = extFromMime(file.mimetype);
    const keyBase = `u/${userId}/a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mainKey = `${keyBase}.${ext}`;
    const thumbKey = `${keyBase}_thumb.${ext}`;
    const mainPath = path.join(UPLOADS_ROOT, mainKey);
    const thumbPath = path.join(UPLOADS_ROOT, thumbKey);

  const mainResized = await sharp(file.buffer).rotate().resize({ width: 1024, height: 1024, fit: 'inside' }).toBuffer();
    await fsp.writeFile(mainPath, mainResized);
    const meta = await sharp(mainResized).metadata();

    const thumbResized = await sharp(file.buffer).rotate().resize({ width: 256, height: 256, fit: 'cover' }).toBuffer();
    await fsp.writeFile(thumbPath, thumbResized);

    // remove existing avatar rows/files
    const { rows: oldRows } = await query<{ storage_key: string }>(`SELECT storage_key FROM photos WHERE user_id = $1 AND kind = 'avatar'`, [userId]);
    if (oldRows.length === 0) {
      // First avatar: enforce total <= 5 including avatar
      const { rows: cntRows } = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM photos WHERE user_id = $1`, [userId]);
      const total = Number(cntRows[0].count || '0');
      if (total >= 5) return next(conflict('MAX_PHOTOS_REACHED', 'Maximum of 5 photos (including avatar)'));
    }
    for (const r of oldRows) {
      const oldMain = path.join(UPLOADS_ROOT, r.storage_key);
      const oldThumb = oldMain.replace(/\.(\w+)$/, '_thumb.$1');
      try { await fsp.unlink(oldMain); } catch {}
      try { await fsp.unlink(oldThumb); } catch {}
    }
    await query(`DELETE FROM photos WHERE user_id = $1 AND kind = 'avatar'`, [userId]);

    const { rows } = await query<{ id: number }>(
      `INSERT INTO photos(user_id, kind, position, storage_key, mime_type, width, height, size_bytes)
       VALUES ($1, 'avatar', NULL, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, mainKey, file.mimetype, meta.width || null, meta.height || null, mainResized.byteLength],
    );
    const id = rows[0].id;
    res.status(201).json({ photo: { id, kind: 'avatar', url: publicUrl(mainKey), thumbUrl: publicUrl(thumbKey) } });
  } catch (e: any) {
    return next(internal('Internal Server Error', String(e?.message || e)));
  }
});

// ---- Photos: POST gallery (max 5) ----
api.post('/me/photos', requireAuth, upload.single('file'), async (req: any, res: any, next: any) => {
  const userId = req.user.id;
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return next(badRequest('NO_FILE', 'No file uploaded'));
  if (!ALLOWED_MIME.has(file.mimetype)) return next(badRequest('UNSUPPORTED_TYPE', 'Unsupported image type'));
  try {
    const { rows: posRows } = await query<{ position: number }>(
      `SELECT position FROM photos WHERE user_id = $1 AND kind = 'gallery' ORDER BY position ASC`,
      [userId],
    );
    // Enforce total <= 5 including avatar
    const { rows: cntRows } = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM photos WHERE user_id = $1`, [userId]);
    const total = Number(cntRows[0].count || '0');
    if (total >= 5) return next(conflict('MAX_PHOTOS_REACHED', 'Maximum of 5 photos (including avatar)'));
    const used = new Set(posRows.map((r) => Number(r.position)));
    let position: number | null = null;
    for (let p = 1; p <= 5; p++) { if (!used.has(p)) { position = p; break; } }
    if (!position) return next(conflict('GALLERY_FULL', 'Gallery is full'));

    const dir = await ensureUserDir(userId);
    const ext = extFromMime(file.mimetype);
    const keyBase = `u/${userId}/g${position}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const mainKey = `${keyBase}.${ext}`;
    const thumbKey = `${keyBase}_thumb.${ext}`;
    const mainPath = path.join(UPLOADS_ROOT, mainKey);
    const thumbPath = path.join(UPLOADS_ROOT, thumbKey);

    const mainResized = await sharp(file.buffer).rotate().resize({ width: 1280, height: 1280, fit: 'inside' }).toBuffer();
    await fsp.writeFile(mainPath, mainResized);
    const meta = await sharp(mainResized).metadata();
    const thumbResized = await sharp(file.buffer).rotate().resize({ width: 256, height: 256, fit: 'cover' }).toBuffer();
    await fsp.writeFile(thumbPath, thumbResized);

    const { rows } = await query<{ id: number }>(
      `INSERT INTO photos(user_id, kind, position, storage_key, mime_type, width, height, size_bytes)
       VALUES ($1, 'gallery', $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, position, mainKey, file.mimetype, meta.width || null, meta.height || null, mainResized.byteLength],
    );
    const id = rows[0].id;
    res.status(201).json({ photo: { id, kind: 'gallery', position, url: publicUrl(mainKey), thumbUrl: publicUrl(thumbKey) } });
  } catch (e: any) {
    return next(internal('Internal Server Error', String(e?.message || e)));
  }
});

// ---- Photos: DELETE by id ----
api.delete('/me/photos/:id', requireAuth, async (req: any, res: any, next: any) => {
  const userId = req.user.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return next(badRequest('VALIDATION_ERROR', 'Invalid id'));
  try {
    const { rows } = await query<{ id: number; kind: string; position: number | null; storage_key: string }>(
      `SELECT id, kind, position, storage_key FROM photos WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId],
    );
    const row = rows[0];
    if (!row) return next(notFound('PHOTO_NOT_FOUND', 'Photo not found'));

    // delete files
    const mainPath = path.join(UPLOADS_ROOT, row.storage_key);
    const thumbPath = mainPath.replace(/\.(\w+)$/, '_thumb.$1');
    try { await fsp.unlink(mainPath); } catch {}
    try { await fsp.unlink(thumbPath); } catch {}

    await query(`DELETE FROM photos WHERE id = $1 AND user_id = $2`, [id, userId]);

    if (row.kind === 'gallery') {
      // compact positions to 1..n without gaps
      const { rows: rest } = await query<{ id: number; position: number }>(
        `SELECT id, position FROM photos WHERE user_id = $1 AND kind = 'gallery' ORDER BY position ASC`,
        [userId],
      );
      let expected = 1;
      for (const r of rest) {
        if (r.position !== expected) {
          await query(`UPDATE photos SET position = $1 WHERE id = $2`, [expected, r.id]);
        }
        expected++;
      }
    }

    res.status(204).send();
  } catch (e: any) {
    return next(internal('Internal Server Error', String(e?.message || e)));
  }
});

// ---- Photos: PATCH reorder ----
const ReorderDto = z.object({
  order: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        position: z.coerce.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(5),
});

api.patch('/me/photos/reorder', requireAuth, async (req: any, res: any, next: any) => {
  const userId = req.user.id;
  const parsed = ReorderDto.safeParse(req.body);
  if (!parsed.success) return next(badRequest('VALIDATION_ERROR', 'Invalid request', parsed.error.flatten()));
  const items = parsed.data.order;
  // validate unique ids and positions
  const ids = items.map((i) => Number(i.id));
  const positions = items.map((i) => Number(i.position));
  if (new Set(ids).size !== ids.length) return next(badRequest('DUPLICATE_IDS', 'Duplicate ids'));
  if (new Set(positions).size !== positions.length) return next(badRequest('DUPLICATE_POSITIONS', 'Duplicate positions'));

  try {
    // fetch current gallery set (id, current position)
    const { rows: current } = await query<{ id: number; position: number }>(
      `SELECT id, position FROM photos WHERE user_id = $1 AND kind = 'gallery' ORDER BY position ASC`,
      [userId],
    );
    if (current.length === 0) return res.json({ gallery: [] });

    const curIds = current.map((r) => r.id);
    const n = current.length;
    const expected = new Set(Array.from({ length: n }, (_, i) => i + 1));

    // Validate provided ids are subset of current ids
    if (!ids.every((id) => curIds.includes(id))) {
      return next(badRequest('INVALID_IDS', 'Some ids are invalid'));
    }

    // Build final position plan starting from current positions (subset overwrite)
    const finalPosById = new Map<number, number>();
    for (const r of current) finalPosById.set(r.id, r.position);
    for (const it of items) finalPosById.set(Number(it.id), Number(it.position));

    // Validate final positions are a permutation of 1..N
    const finalPositions = curIds.map((id) => finalPosById.get(id)!);
    const finalSet = new Set(finalPositions);
    if (finalSet.size !== n || !finalPositions.every((p) => expected.has(p))) {
      return next(badRequest('INVALID_POSITIONS', 'Positions must be a 1..N permutation'));
    }

    // Perform single CASE update for all current ids using DEFERRABLE UNIQUE
    const params: any[] = [userId, ...curIds, ...finalPositions, curIds];
    const whenClauses = curIds
      .map((_, idx) => `WHEN id = $${2 + idx} THEN $${2 + n + idx}`)
      .join(' ');
    const sql = `UPDATE photos
                 SET position = CASE ${whenClauses} ELSE position END
                 WHERE user_id = $1 AND kind = 'gallery' AND id = ANY($${2 * n + 2}::int[])`;
    await query(sql, params);

    const { rows: list } = await query<any>(
      `SELECT id, kind, position, storage_key, mime_type, width, height, size_bytes
       FROM photos WHERE user_id = $1 AND kind = 'gallery' ORDER BY position ASC`,
      [userId],
    );
    const map = (r: any) => ({
      ...r,
      url: publicUrl(r.storage_key),
      thumbUrl: publicUrl(r.storage_key.replace(/\.(\w+)$/, '_thumb.$1')),
    });
    res.json({ gallery: list.map(map) });
  } catch (e: any) {
    return next(internal('Internal Server Error', String(e?.message || e)));
  }
});

// ---- HTTP + WS ----
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/ws',
  cors: {
    origin: ORIGINS,
    credentials: true,
  },
});

// --- Socket.IO auth: verify JWT from Cookie during handshake ---
function parseCookie(header?: string) {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

io.use((socket: any, next: any) => {
  try {
    const cookies = parseCookie(socket.handshake.headers?.cookie as string | undefined);
    const token = cookies['access_token'];
    if (!token) return next(new Error('Unauthorized'));
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev') as any;
    socket.data = socket.data || {};
    socket.data.userId = Number(payload.sub);
    socket.data.username = payload.username;
    return next();
  } catch (_e) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket: any) => {
  // basic handshake
  // authenticated user context
  // eslint-disable-next-line no-console
  console.log('[ws] connected userId=%s username=%s', socket.data?.userId, socket.data?.username);
  socket.emit('hello', { message: 'connected', userId: socket.data?.userId });

  socket.on('ping', () => socket.emit('pong'));

  socket.on('disconnect', (_reason: any) => {
    // optional logging
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${PORT}`);
});

// ---- Not Found handler ----
app.use((_req: any, _res: any, next: any) => {
  next(new AppError('NOT_FOUND', 404, 'Not Found'));
});

// ---- Error handler (unified error responses) ----
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  if (res.headersSent) return; // let Express handle
  // Zod error fallback
  if (err?.issues && Array.isArray(err.issues)) {
    const payload = { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten?.() || err.issues };
    return res.status(400).json({ error: payload });
  }
  const status = Number(err?.status) || 500;
  const code = typeof err?.code === 'string' ? err.code : status === 500 ? 'INTERNAL_ERROR' : 'ERROR';
  const message = err?.message || (status === 500 ? 'Internal Server Error' : 'Error');
  const details = err?.details;
  return res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
});
