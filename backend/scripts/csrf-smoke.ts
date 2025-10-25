/*
 Simple CSRF smoke test for session-bound actions.
 Verifies that:
  - POST /api/auth/logout without X-CSRF-Token returns 403 when logged in
  - With a valid X-CSRF-Token (from a prior GET), logout succeeds (204)
*/

declare const process: any;

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function parseSetCookie(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  // header may contain multiple Set-Cookie separated by comma, but values can also contain commas.
  // Node combines multiple headers; safer to split by '\n' if multiple were present.
  const parts = header.split(/,(?=[^;]*=)/g); // naive split on cookie boundaries
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

async function getWithCookies(path: string, cookies: Record<string, string>) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader, Accept: 'application/json' } });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, headers: res.headers, body: await json(res), setCookie };
}

async function postWithCookies(path: string, cookies: Record<string, string>, body?: any, extraHeaders?: Record<string, string>) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Cookie: cookieHeader, ...(extraHeaders || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, headers: res.headers, body: await json(res) };
}

function rand() { return Math.random().toString(36).slice(2, 10); }

async function main() {
  const email = `csrf_${Date.now()}@example.com`;
  const username = `csrf_${rand()}`;
  const password = 'Password!234';

  const r = await register(email, username, password);
  if (r.status !== 201) throw new Error(`register failed: ${r.status}`);
  const cookies = r.cookies; // includes access_token

  // 1) Try to logout without CSRF header: expect 403
  const noCsrf = await postWithCookies('/api/auth/logout', cookies);
  console.log('logout without csrf ->', noCsrf.status, noCsrf.body);
  if (noCsrf.status !== 403) throw new Error('expected 403 without csrf');

  // 2) Get CSRF token header via safe GET (health)
  const g = await getWithCookies('/api/health', cookies);
  // merge newly set cookies (e.g., csrf_token)
  const newCookies = parseSetCookie(g.setCookie);
  Object.assign(cookies, newCookies);
  const csrf = g.headers.get('x-csrf-token');
  if (!csrf) throw new Error('missing x-csrf-token on GET');

  // 3) Logout with CSRF header: expect 204
  const ok = await postWithCookies('/api/auth/logout', cookies, undefined, { 'X-CSRF-Token': csrf });
  console.log('logout with csrf ->', ok.status);
  if (ok.status !== 204) throw new Error('expected 204 with csrf');

  console.log('CSRF SMOKE OK');
}

main().catch((e) => { console.error('CSRF SMOKE FAIL', e); process.exit(1); });
