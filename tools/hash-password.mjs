#!/usr/bin/env node
// Generate a PBKDF2-HMAC-SHA256 entry for the PASSWORD_HASHES env var.
// Usage:  node tools/hash-password.mjs "your password here"
// Output: base64url(salt):base64url(hash)  ← paste into Cloudflare env var

import { webcrypto } from 'node:crypto';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN_BYTES = 32;

function b64uEncode(buf) {
  return Buffer.from(buf).toString('base64url');
}

async function pbkdf2(password, salt) {
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    PBKDF2_KEYLEN_BYTES * 8,
  );
  return new Uint8Array(bits);
}

const password = process.argv[2];
if (!password) {
  console.error('Usage: node tools/hash-password.mjs "your password"');
  process.exit(1);
}

const salt = webcrypto.getRandomValues(new Uint8Array(16));
const hash = await pbkdf2(password, salt);
const entry = `${b64uEncode(salt)}:${b64uEncode(hash)}`;

console.log('');
console.log('Entry (paste into PASSWORD_HASHES env var on Cloudflare Pages):');
console.log('');
console.log(`  ${entry}`);
console.log('');
console.log('For multiple passwords (one per person), comma-separate them in the env var:');
console.log('  PASSWORD_HASHES = "salt1:hash1,salt2:hash2,salt3:hash3"');
console.log('');
