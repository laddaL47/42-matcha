/*
 Profile CRUD smoke test:
 - register new user (store cookie)
 - PATCH /api/me/profile with CSRF header
 - GET /api/me/profile and verify fields
 - GET /api/users/:username to verify public view
*/

declare const process: any;

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

async function patchWithCookies(path: string, cookies: Record<string, string>, body: any, csrf: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookieHeader(cookies),
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await json(res) };
}

function rand() { return Math.random().toString(36).slice(2, 10); }

async function main() {
  const username = `prof_${rand()}`;
  const email = `${username}@example.com`;
  const password = 'Password!234';

  const r = await register(email, username, password);
  if (r.status !== 201) throw new Error(`register failed: ${r.status}`);
  const cookies = r.cookies;

  // get CSRF token via safe GET
  const h = await getWithCookies('/api/health', cookies);
  const newCookies = parseSetCookie(h.setCookie);
  Object.assign(cookies, newCookies);
  const csrf = h.headers.get('x-csrf-token');
  if (!csrf) throw new Error('missing x-csrf-token');

  // patch profile
  const payload = { displayName: 'テスト太郎', bio: 'Hello, this is me', gender: 'other', sexualPref: 'straight', birthdate: '1999-12-31', fameRating: 10 };
  const p = await patchWithCookies('/api/me/profile', cookies, payload, csrf);
  if (p.status !== 200) throw new Error(`patch failed: ${p.status} ${JSON.stringify(p.body)}`);
  console.log('patch ->', p.body);

  // get profile
  const g = await getWithCookies('/api/me/profile', cookies);
  if (g.status !== 200) throw new Error(`get me profile failed: ${g.status}`);
  console.log('me profile ->', g.body);

  // public profile by username
  const pub = await getWithCookies(`/api/users/${username}`, {});
  if (pub.status !== 200) throw new Error(`public profile failed: ${pub.status}`);
  console.log('public profile ->', pub.body);

  console.log('PROFILE SMOKE OK');
}

main().catch((e) => { console.error('PROFILE SMOKE FAIL', e); process.exit(1); });
