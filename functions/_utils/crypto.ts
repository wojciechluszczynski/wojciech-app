// Crypto helpers for password verification (PBKDF2) and cookie signing (HMAC-SHA256).
// Uses Web Crypto API — available on Cloudflare Workers / Pages Functions.

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32;
const HMAC_ALG = { name: 'HMAC', hash: 'SHA-256' } as const;

// Constant-time byte-array comparison.
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Decode base64url (no padding) → Uint8Array.
export function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Encode Uint8Array → base64url (no padding).
export function b64uEncode(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// PBKDF2-HMAC-SHA256 of `password` with `salt`. Returns 32-byte derived key.
export async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    PBKDF2_KEYLEN * 8,
  );
  return new Uint8Array(bits);
}

// Verify a password against an entry `salt_b64u:hash_b64u`.
export async function verifyPassword(password: string, entry: string): Promise<boolean> {
  const [saltStr, hashStr] = entry.split(':');
  if (!saltStr || !hashStr) return false;
  const salt = b64uDecode(saltStr);
  const expected = b64uDecode(hashStr);
  const actual = await pbkdf2(password, salt);
  return timingSafeEqual(actual, expected);
}

// HMAC-SHA256(payload, secret) — for signing cookie tokens.
async function hmac(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    HMAC_ALG,
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(HMAC_ALG, key, new TextEncoder().encode(payload));
  return new Uint8Array(sig);
}

// Issue an auth token. Returns `payload.signature` where payload = `ts.rand`.
export async function signToken(secret: string): Promise<string> {
  const ts = Date.now().toString();
  const rand = b64uEncode(crypto.getRandomValues(new Uint8Array(8)));
  const payload = `${ts}.${rand}`;
  const sig = await hmac(payload, secret);
  return `${payload}.${b64uEncode(sig)}`;
}

// Verify a token. Returns true if signature is valid AND issued within `maxAgeMs`.
export async function verifyToken(token: string, secret: string, maxAgeMs: number): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tsStr, rand, sigStr] = parts;
  const payload = `${tsStr}.${rand}`;
  const expectedSig = await hmac(payload, secret);
  const actualSig = b64uDecode(sigStr);
  if (!timingSafeEqual(actualSig, expectedSig)) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > maxAgeMs) return false;
  return true;
}
