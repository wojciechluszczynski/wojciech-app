# app.wojciech.io — auth setup (B1: single password + Worker)

Real server-side gate. Replaces the old client-side `checkPw()` that ships the protected content to every visitor.

## How it works

1. Visitor requests any path on `app.wojciech.io`.
2. **`functions/_middleware.ts`** intercepts at the Cloudflare edge:
   - If a valid `wapp_auth` cookie is present → request passes through to the static `index.html`.
   - Otherwise → middleware serves `login.html` with HTTP 401. The protected app content never leaves the edge.
3. Visitor enters password on `login.html` → JS POSTs to **`functions/api/auth.ts`**.
4. The Worker validates the password against `PASSWORD_HASHES` (PBKDF2-HMAC-SHA256, constant-time compare) and, on success, sets an HttpOnly + Secure + SameSite=Lax signed cookie (HMAC-SHA256 of timestamp + nonce, keyed by `COOKIE_SECRET`).
5. Browser reloads `/`. Middleware sees a valid cookie, lets the request through, `index.html` ships normally.

## One-time setup

### 1. Generate a password hash

```bash
node tools/hash-password.mjs "your strong password here"
```

Output looks like `aBc123…:xYz789…` (salt:hash, both base64url-encoded). Run once per password — multiple passwords can be valid simultaneously.

### 2. Generate a cookie secret

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep this **secret**. Anyone who has it can forge auth cookies.

### 3. Set Cloudflare Pages environment variables

In CF dashboard → Pages → `wojciech-app` project → Settings → Environment variables (Production):

| Variable | Value |
|---|---|
| `PASSWORD_HASHES` | one or more `salt:hash` entries, comma-separated |
| `COOKIE_SECRET` | the 32-byte base64url string from step 2 |
| `COOKIE_MAX_AGE_DAYS` | optional, defaults to `30` |

**Don't commit these to git.** They live only in CF dashboard.

### 4. Deploy

Push this branch to GitHub. CF Pages will build a preview deployment automatically. Test the preview URL → if it works, merge to `main` to deploy to production.

## Adding / revoking access

- **Add a password:** run `node tools/hash-password.mjs "new password"`, append the new entry to `PASSWORD_HASHES` in CF dashboard (comma-separated).
- **Revoke a single password:** remove its entry from `PASSWORD_HASHES`. Other passwords keep working. Active sessions for the revoked password stay valid until the cookie expires (next step is for that).
- **Revoke all active sessions immediately:** rotate `COOKIE_SECRET`. Every existing cookie becomes invalid instantly.

## Files

- `functions/_middleware.ts` — cookie check, serves `login.html` to unauthenticated requests.
- `functions/api/auth.ts` — POST validates password and sets cookie. DELETE clears cookie (logout).
- `functions/_utils/crypto.ts` — PBKDF2, HMAC, base64url helpers using Web Crypto API.
- `login.html` — standalone login UI (light + dark, theme toggle, lang selector). Self-contained, no external assets.
- `index.html` — the protected app. Inline `<div id="gate">` removed; auth is now server-side.
- `tools/hash-password.mjs` — Node script for generating PBKDF2 entries.

## Notes / non-goals (today)

- **Rate limiting.** No persistent rate limiter is wired up yet. Brute force is partly throttled by PBKDF2 cost (~100ms per attempt). If access becomes more sensitive or starts seeing traffic, add a KV/Durable-Object-backed limiter on `functions/api/auth.ts`.
- **Per-user audit log.** Path B2 (email + OTP PIN) would give that. B1 issues per-password, not per-person.
- **CSRF.** The auth endpoint accepts JSON POST; the cookie is `SameSite=Lax`. Good enough for a single-origin flow. If you ever add cross-origin frontends, add a CSRF token.
- **Logout UI.** Endpoint exists (`DELETE /api/auth`). No button surfaced yet — add one to `index.html` when you want it.

## Local testing

```bash
npx wrangler pages dev .
# Then in another terminal:
node tools/hash-password.mjs "test123"
# Export the entry as PASSWORD_HASHES env var for wrangler, plus COOKIE_SECRET.
# Visit http://localhost:8788/ — should see login.html.
```
