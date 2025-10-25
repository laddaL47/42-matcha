/*
 WebSocket auth test for Socket.IO handshake using JWT in Cookie.
 - unauthenticated connection should fail with connect_error 'Unauthorized'
 - authenticated connection (with access_token cookie) should succeed and exchange hello + ping/pong
*/

declare const process: any;

import { io } from 'socket.io-client';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const WS_URL = BASE; // same origin
const WS_PATH = process.env.WS_PATH || '/ws';

function parseSetCookie(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  const parts = header.split(/,(?=[^;]*=)/g);
  for (const p of parts) {
    const m = p.trim().match(/^(.*?)=([^;]*)(;|$)/);
    if (m) cookies[m[1]] = m[2];
  }
  return cookies;
}

async function json(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

async function register(username: string, email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: await json(res), cookies: parseSetCookie(setCookie) };
}

async function login(emailOrUsername: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: await json(res), cookies: parseSetCookie(setCookie) };
}

function cookieHeader(cookies: Record<string, string>) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function rand() { return Math.random().toString(36).slice(2, 10); }

async function main() {
  // Unauthenticated attempt should fail
  await new Promise<void>((resolve) => {
    const s = io(WS_URL, { path: WS_PATH, transports: ['websocket'], timeout: 3000 });
    s.on('connect', () => {
      console.error('[unauth] should not connect');
      s.close();
      process.exit(1);
    });
    s.on('connect_error', (err: any) => {
      console.log('[unauth] connect_error as expected:', err?.message || err);
      s.close();
      resolve();
    });
  });

  // Register and/or login to get access_token cookie
  const username = `ws_${rand()}`;
  const email = `${username}@example.com`;
  const password = 'Password!234';
  let cookies: Record<string, string> = {};

  const r = await register(username, email, password);
  if (r.status !== 201) throw new Error(`register failed: ${r.status}`);
  cookies = { ...cookies, ...r.cookies };

  if (!cookies['access_token']) {
    const l = await login(username, password);
    if (l.status !== 200) throw new Error(`login failed: ${l.status}`);
    cookies = { ...cookies, ...l.cookies };
  }

  if (!cookies['access_token']) throw new Error('no access_token cookie');

  // Authenticated connection should succeed and receive hello
  await new Promise<void>((resolve, reject) => {
    const s = io(WS_URL, {
      path: WS_PATH,
      transports: ['websocket'],
      extraHeaders: { Cookie: cookieHeader(cookies) },
      timeout: 5000,
    });
    s.on('connect', () => console.log('[auth] connected'));
    s.on('hello', (payload: any) => {
      console.log('[server->client] hello', payload);
      s.emit('ping');
    });
    s.on('pong', () => {
      console.log('[server->client] pong');
      s.close();
      resolve();
    });
    s.on('connect_error', (err: any) => {
      s.close();
      reject(err);
    });
  });

  console.log('WS AUTH TEST OK');
}

main().catch((e) => { console.error('WS AUTH TEST FAIL', e); process.exit(1); });
