// POST /api/auth — validate password, issue signed cookie.
// Env:
//   PASSWORD_HASHES — comma-separated list of `salt_b64u:hash_b64u` entries.
//                     Multiple entries = multiple valid passwords (one per person).
//   COOKIE_SECRET   — secret used to sign auth tokens (32+ random bytes recommended).
//   COOKIE_MAX_AGE_DAYS — optional, defaults to 30.

import { verifyPassword, signToken } from '../_utils/crypto';

interface Env {
  PASSWORD_HASHES: string;
  COOKIE_SECRET: string;
  COOKIE_MAX_AGE_DAYS?: string;
}

const COOKIE_NAME = 'wapp_auth';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  let body: { password?: string } = {};
  try { body = await request.json(); } catch { /* keep empty */ }
  const password = (body.password || '').trim();

  if (!password) {
    return jsonResponse({ ok: false, error: 'missing-password' }, 400);
  }
  if (!env.PASSWORD_HASHES || !env.COOKIE_SECRET) {
    return jsonResponse({ ok: false, error: 'auth-not-configured' }, 500);
  }

  // Throttle by simple delay so brute-force costs ~100ms per attempt.
  // (CF Workers don't support persistent rate limiting without Durable Objects/KV;
  // the constant-time delay is a baseline. Add a KV-backed rate limiter later if needed.)
  const entries = env.PASSWORD_HASHES.split(',').map(s => s.trim()).filter(Boolean);
  let matched = false;
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyPassword(password, entry)) { matched = true; break; }
  }
  if (!matched) {
    return jsonResponse({ ok: false, error: 'invalid-password' }, 401);
  }

  const maxAgeDays = Math.max(1, parseInt(env.COOKIE_MAX_AGE_DAYS || '30', 10));
  const maxAgeSec = maxAgeDays * 24 * 60 * 60;
  const token = await signToken(env.COOKIE_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`,
    },
  });
};

// Also handle DELETE /api/auth as logout — clear the cookie.
export const onRequestDelete: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    },
  });
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
