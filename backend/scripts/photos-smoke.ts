/*
 Photos upload smoke test:
 - register user -> get CSRF -> upload avatar (in-memory image)
 - upload two gallery photos
 - list photos and check avatar/gallery present
*/

declare const process: any;
import sharp from 'sharp';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

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

async function register(email: string, username: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: await json(res), cookies: parseSetCookie(setCookie) };
}

function cookieHeader(cookies: Record<string, string>) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function getWithCookies(path: string, cookies: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader(cookies), Accept: 'application/json' } });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, headers: res.headers, body: await json(res), setCookie };
}

async function uploadForm(path: string, cookies: Record<string, string>, csrf: string, blob: Blob, filename: string) {
  const fd = new FormData();
  fd.append('file', blob, filename);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Cookie: cookieHeader(cookies), 'X-CSRF-Token': csrf },
    body: fd,
  });
  return { status: res.status, body: await json(res) };
}

function rand() { return Math.random().toString(36).slice(2, 10); }

async function makePngBlob(color: string): Promise<Blob> {
  const buf = await sharp({ create: { width: 16, height: 16, channels: 3, background: color } }).png().toBuffer();
  return new Blob([buf], { type: 'image/png' });
}

async function main() {
  const username = `photo_${rand()}`;
  const email = `${username}@example.com`;
  const password = 'Password!234';

  const r = await register(email, username, password);
  if (r.status !== 201) throw new Error(`register failed: ${r.status}`);
  const cookies = r.cookies;

  const h = await getWithCookies('/api/health', cookies);
  const newCookies = parseSetCookie(h.setCookie);
  Object.assign(cookies, newCookies);
  const csrf = h.headers.get('x-csrf-token');
  if (!csrf) throw new Error('missing csrf');

  const blob1 = await makePngBlob('#ff0000');
  const av = await uploadForm('/api/me/avatar', cookies, csrf, blob1, 'a.png');
  if (av.status !== 201) throw new Error(`avatar upload failed: ${av.status} ${JSON.stringify(av.body)}`);

  const blob2 = await makePngBlob('#00ff00');
  const g1 = await uploadForm('/api/me/photos', cookies, csrf, blob2, 'g1.png');
  if (g1.status !== 201) throw new Error(`gallery upload 1 failed: ${g1.status}`);

  const blob3 = await makePngBlob('#0000ff');
  const g2 = await uploadForm('/api/me/photos', cookies, csrf, blob3, 'g2.png');
  if (g2.status !== 201) throw new Error(`gallery upload 2 failed: ${g2.status}`);

  const blob4 = await makePngBlob('#ffff00');
  const g3 = await uploadForm('/api/me/photos', cookies, csrf, blob4, 'g3.png');
  if (g3.status !== 201) throw new Error(`gallery upload 3 failed: ${g3.status}`);

  const blob5 = await makePngBlob('#ff00ff');
  const g4 = await uploadForm('/api/me/photos', cookies, csrf, blob5, 'g4.png');
  if (g4.status !== 201) throw new Error(`gallery upload 4 failed: ${g4.status}`);

  const list = await getWithCookies('/api/me/photos', cookies);
  if (list.status !== 200) throw new Error(`list failed: ${list.status}`);
  const body: any = list.body;
  if (!body.avatar || body.gallery.length !== 4) throw new Error('expected avatar and exactly 4 gallery photos (total 5)');

  // Try to exceed limit: expect 409
  const blob6 = await makePngBlob('#00ffff');
  const g5 = await uploadForm('/api/me/photos', cookies, csrf, blob6, 'g5.png');
  if (g5.status !== 409) throw new Error(`expected 409 on 6th photo, got: ${g5.status}`);

  console.log('PHOTOS SMOKE OK');
}

main().catch((e) => { console.error('PHOTOS SMOKE FAIL', e); process.exit(1); });
