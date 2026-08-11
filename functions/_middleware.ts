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

// Paths that bypass auth check (exact match).
const ALLOWED = [
  '/api/auth',
  '/login.html',
  '/wojciech-photo.png', // profile photo used on login page
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/robots.txt',
  // /llms.txt is not listed: REDIRECTS above sends it to the root site before
  // this check runs, so an entry here would never be reached.
  '/bimi.svg',
  '/og-default.png',
  '/manifest.json',
];

// Path prefixes that bypass auth (for directories of static assets needed by login page).
const ALLOWED_PREFIXES = [
  '/fonts/', // Geist font files loaded by login.html
];

// Paths that belong to the root site, redirected here rather than in
// _redirects.
//
// _redirects is inert on this project. This middleware matches every route, so
// it runs before the asset pipeline that would apply those rules, and nothing
// in _redirects has ever fired: /now is declared there as a 301 to
// wojciech.io/now/ and answers 401 from the auth gate instead. Redirecting
// here is the only layer that actually executes.
//
// These run before the auth check on purpose. They are public pointers at
// public pages, and gating them behind a login would be pointless.
const REDIRECTS: Record<string, string> = {
  '/llms.txt': 'https://wojciech.io/llms.txt',
  '/humans.txt': 'https://wojciech.io/humans.txt',
  '/now': 'https://wojciech.io/now/',
  '/now/': 'https://wojciech.io/now/',
};

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, next } = ctx;
  const url = new URL(request.url);

  const redirectTo = REDIRECTS[url.pathname];
  if (redirectTo) {
    return Response.redirect(redirectTo, 301);
  }

  if (ALLOWED.includes(url.pathname) || ALLOWED_PREFIXES.some((p) => url.pathname.startsWith(p))) {
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
