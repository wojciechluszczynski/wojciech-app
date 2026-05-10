# wojciech.io - Portfolio

Personal portfolio for Wojciech Luszczynski, available at **[app.wojciech.io](https://app.wojciech.io)**.

Single-file app built with vanilla HTML/CSS/JS. Deployed on Vercel.

## Structure

```
Portfolio/
  index.html      # Entire app - all sections, styles, and logic in one file
  vercel.json     # Vercel routing rewrites and security headers
  manifest.json   # PWA manifest
  robots.txt      # Crawler rules
  bimi.svg        # Brand logo for email BIMI
  .gitignore
```

## Sections

| Route | Description |
|-------|-------------|
| `/apps` | Projects grid with search and tag filters |
| `/stack` | Tech stack and tools used |
| `/timeline` | Career milestones |
| `/cv` | Downloadable resume |
| `/contact` | Contact form |

## Languages

Supports PL / EN / IT via `data-pl`, `data-en`, `data-it` HTML attributes. Language switcher in the top nav.

## Deploying

The site deploys automatically via Vercel on every push to `main`.

```bash
# Make changes to index.html, then:
git add -A
git commit -m "Your message"
git push origin main
```

Vercel picks up the push and deploys to production within ~30 seconds.

### Manual deploy (CLI)

```bash
vercel --prod --yes
```

> Note: Vercel CLI deploys the git-committed version. Always commit before running CLI deploy.

## DNS

Hosted at Vercel IP `76.76.21.21`. DNS managed in OVH panel:

```
app.wojciech.io       A  76.76.21.21
subscribe.wojciech.io A  76.76.21.21
```

## Related

- **Newsletter signup**: `subscribe.wojciech.io` - separate Vercel project in `/Subscribe/`
- **Resend**: email delivery for newsletter subscriptions

## Tech

Vanilla HTML, CSS, JS. No build step, no bundler, no framework.
