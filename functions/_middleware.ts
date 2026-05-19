// Cloudflare Pages Functions middleware — gates every request behind the auth cookie.
// Unauthenticated requests receive login.html instead of the protected app.

import { verifyToken } from './_utils/crypto';

interface Env {
  APP_PASSWORD: string;
  COOKIE_SECRET: string;
  COOKIE_MAX_AGE_DAYS?: string;
  ASSETS: Fetcher;
}

const COOKIE_NAME = 'wapp_auth';

// Paths that bypass auth check.
// /api/auth — login endpoint itself
// /login.html — the login page (served by middleware too, but kept allowed for direct access)
// /favicon*, /apple-touch-icon*, /robots.txt, /bimi.svg — browser/crawler default fetches
// /og-default.png, /manifest.json — discoverable metadata, no sensitive content
const ALLOWED = [
  '/api/auth',
  '/login.html',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/robots.txt',
  '/llms.txt',
  '/bimi.svg',
  '/og-default.png',
  '/manifest.json',
];

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, next } = ctx;
  const url = new URL(request.url);

  if (ALLOWED.includes(url.pathname)) {
    return next();
  }

  if (await isAuthenticated(request, env)) {
    return next();
  }

  // Not authenticated — serve login.html from static assets.
  const loginUrl = new URL(request.url);
  loginUrl.pathname = '/login.html';
  const loginResponse = await env.ASSETS.fetch(new Request(loginUrl.toString(), { method: 'GET' }));

  // Return with 401 so it's clear to clients that this is a gate, not the real content.
  // But keep content-type/body from the asset fetch.
  const body = await loginResponse.arrayBuffer();
  return new Response(body, {
    status: 401,
    headers: {
      'content-type': loginResponse.headers.get('content-type') || 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};

async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  if (!env.COOKIE_SECRET) return false;
  const cookieHeader = request.headers.get('cookie') || '';
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  if (!token) return false;

  const maxAgeDays = Math.max(1, parseInt(env.COOKIE_MAX_AGE_DAYS || '30', 10));
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return verifyToken(token, env.COOKIE_SECRET, maxAgeMs);
}

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}
