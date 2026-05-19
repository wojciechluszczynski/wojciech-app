# Auth setup — app.wojciech.io

The app sits behind a server-side gate (Cloudflare Pages Functions). An
unauthenticated request never receives the app HTML — it gets `login.html`
instead. After a correct password the visitor gets a signed cookie and
stays in for 30 days.

## Cloudflare environment variables

Set these in **CF Dashboard → Workers & Pages → wojciech-app → Settings →
Variables and Secrets**, for **both** Production and Preview:

| Name | Type | Value |
|------|------|-------|
| `APP_PASSWORD` | Secret | The password that unlocks the app. Plain text — just type it. |
| `COOKIE_SECRET` | Secret | A random string (32+ chars). Generate once, never changes. |
| `COOKIE_MAX_AGE_DAYS` | Plaintext | Optional. Session length in days. Defaults to 30. |

Generate `COOKIE_SECRET` once:

```
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

After changing any variable, **redeploy** (Deployments → ⋯ → Retry
deployment) — CF binds variables at build time.

## Sharing access

There is one shared password (`APP_PASSWORD`). To let someone in, give them
the URL and the password. To revoke everyone at once, change `COOKIE_SECRET`
— every active session dies immediately.

## Endpoints

- `POST /api/auth` `{ "password": "..." }` → sets the auth cookie
- `DELETE /api/auth` → clears the cookie (logout)

## Deliberately out of scope

- Rate limiting — add a KV-backed limiter if brute-force shows up.
- Per-person passwords / audit log — would need an email-OTP flow.
