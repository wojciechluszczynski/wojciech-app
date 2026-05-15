# app.wojciech.io

Private app workspace for Wojciech Luszczynski, available at `https://app.wojciech.io`.

Single-file vanilla HTML/CSS/JS app. Deployed on Cloudflare Pages from `main`.

## Structure

```text
index.html      # Entire app: sections, styles, and logic
_headers        # Cloudflare Pages security/cache headers
_redirects      # Cloudflare Pages SPA fallbacks
manifest.json   # PWA manifest
robots.txt      # Crawler rules
bimi.svg        # Brand mark for email BIMI
```

## Sections

| Route | Description |
| --- | --- |
| `/apps` | Projects grid with search and tag filters |
| `/stack` | Tech stack and tools used |
| `/timeline` | Career milestones |
| `/cv` | Interactive CV |
| `/contact` | Contact and newsletter intake |

## Deployment

Cloudflare Pages builds from `main`.

```sh
git add -A
git commit -m "Describe the change"
git push origin main
```
