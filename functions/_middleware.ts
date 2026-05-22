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
  // Emit security headers explicitly — login.html is served via env.ASSETS and
  // does NOT pass through any Astro Layout, so its headers must be set here.
  // Discovery context: wojciech.io PR #8 (Issue #12) added a CI headers-check
  // that flagged app.wojciech.io/login as missing all 6 required headers.
  const body = await loginResponse.arrayBuffer();
  return new Response(body, {
    status: 401,
    headers: {
      'content-type': loginResponse.headers.get('content-type') || 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS,
    },
  });
};

// Security headers applied to the 401 gate response. Policy mirrors what
// other gated subdomains (academy, notch, subscribe, gh) emit via their
// Astro Layout. CSP is permissive enough for the inline-styled login page.
const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
} as const;

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
