/*
 End-to-end smoke test for auth flows using MailHog.
 - register -> verify-email via MailHog
 - forgot-password -> reset-password via MailHog
 - login with new password
 Requires: docker compose up -d (postgres, mailhog), backend dev server running on PORT
*/

declare const process: any;

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MAILHOG = process.env.MAILHOG_URL || 'http://localhost:8025';

function rand() {
  return Math.random().toString(36).slice(2, 10);
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
  return { status: res.status, body: await json(res) };
}

async function mailhogMessages() {
  const res = await fetch(`${MAILHOG}/api/v2/messages`);
  const data = await res.json();
  return data.items as any[];
}

function latestBy(items: any[], pred: (it: any) => boolean) {
  const filtered = items.filter(pred);
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime());
  return filtered[0];
}

function extractTokenFromBody(body: string, keyword: 'verify' | 'reset'): string | null {
  // Decode common quoted-printable patterns from MailHog
  const qp = body.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
  const m = qp.match(/token=([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

async function verifyByMail(email: string) {
  const items = await mailhogMessages();
  const msg = latestBy(items, (it) =>
    it?.Content?.Headers?.Subject?.[0]?.includes('Verify your email') &&
    (it?.Content?.Headers?.To?.[0] || '').includes(email)
  );
  if (!msg) throw new Error('verify email not found');
  const body = msg.Content?.Body || '';
  const tok = extractTokenFromBody(body, 'verify');
  if (!tok) throw new Error('verify token not found');
  const res = await fetch(`${BASE}/api/auth/verify-email?token=${tok}`, { headers: { Accept: 'application/json' } });
  return { status: res.status, body: await json(res) };
}

async function forgot(emailOrUsername: string) {
  const res = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ emailOrUsername }),
  });
  return { status: res.status, body: await json(res) };
}

async function resetByMail(email: string, newPassword: string) {
  const items = await mailhogMessages();
  const msg = latestBy(items, (it) =>
    it?.Content?.Headers?.Subject?.[0]?.includes('Reset your password') &&
    (it?.Content?.Headers?.To?.[0] || '').includes(email)
  );
  if (!msg) throw new Error('reset email not found');
  const body = msg.Content?.Body || '';
  const tok = extractTokenFromBody(body, 'reset');
  if (!tok) throw new Error('reset token not found');
  const res = await fetch(`${BASE}/api/auth/reset-password?token=${tok}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  return { status: res.status, body: await json(res) };
}

async function login(emailOrUsername: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });
  return { status: res.status, body: await json(res), headers: res.headers };
}

async function main() {
  const email = `e2e_${Date.now()}@example.com`;
  const username = `e2e_${rand()}`;
  const password = 'Password!234';
  const newPassword = 'NewPass!2345';

  console.log('register', { email, username });
  const r1 = await register(email, username, password);
  console.log('register ->', r1.status, r1.body);
  if (r1.status !== 201) throw new Error('register failed');

  // allow async mail delivery
  await new Promise((res) => setTimeout(res, 500));

  const v = await verifyByMail(email);
  console.log('verify ->', v.status, v.body);
  if (v.status !== 200 || !v.body?.ok) throw new Error('verify failed');

  const f = await forgot(email);
  console.log('forgot ->', f.status, f.body);
  if (f.status !== 200) throw new Error('forgot failed');

  // allow async mail delivery
  await new Promise((res) => setTimeout(res, 500));

  const rp = await resetByMail(email, newPassword);
  console.log('reset ->', rp.status, rp.body);
  if (rp.status !== 200 || !rp.body?.ok) throw new Error('reset failed');

  const lg = await login(email, newPassword);
  console.log('login ->', lg.status, lg.body);
  if (lg.status !== 200) throw new Error('login after reset failed');

  console.log('AUTH E2E OK');
}

main().catch((e) => {
  console.error('AUTH E2E FAIL', e);
  process.exit(1);
});
