# The Treatment Room by Hayley Casey

Business website for a permanent makeup artist in Urmston, Manchester.  
Live at **[hayleycasey.co.uk](https://hayleycasey.co.uk)**

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Single-page HTML/CSS/JS (`index.html`) |
| Fonts | Self-hosted Cormorant Garamond + Jost (`fonts/`) |
| Form backend | PHP `mail()` on Apache (IONOS shared hosting) |
| CDN / proxy | Cloudflare (free plan) |
| Hosting | IONOS — files live at `/httpdocs` |
| CI/CD | GitHub Actions → SFTP deploy on push to `main` |
| Local dev server | Node.js (`serve.mjs`) with nodemailer for email testing |

---

## Project structure

```
.
├── index.html                  # Entire frontend — HTML, CSS, JS all inline
├── helpers.php                 # Shared PHP functions (h, yn, ck) — not web-accessible
├── send-message.php            # POST handler for contact form → hello@hayleycasey.co.uk
├── send-consultation.php       # POST handler for consultation form → consultations@hayleycasey.co.uk
├── send-message/index.php      # Shim: include('../send-message.php') — for cached-browser compat
├── send-consultation/index.php # Shim: include('../send-consultation.php')
├── robots.txt                  # User-agent: * Allow: / + Sitemap reference
├── sitemap.xml                 # All 7 sections listed
├── .htaccess                   # HTTPS redirect, rewrite rules, caching, security headers
├── brand_assets/               # Images — .webp only deployed; originals kept locally
├── fonts/                      # Self-hosted woff2 files (6 files, 2 families)
├── serve.mjs                   # Local dev server (NOT deployed)
├── screenshot.mjs              # Puppeteer screenshot helper (NOT deployed)
└── .github/workflows/deploy.yml
```

### Why everything is in one `index.html`

The site has no build pipeline. All CSS and JS are inlined so there is exactly one network request for the page. Navigation between sections (`home`, `prices`, `gallery`, `room`, `faqs`, `contact`, `consult`) is handled by `showPage(sectionName)` in JS — sections are shown/hidden with `display:none`/`display:block` via `.page` / `.page.active` CSS classes.

If the site grows significantly, the natural next step is to introduce a build tool (Vite or a simple Node script) that maintains separate source files and inlines them at build time.

---

## Running locally

```bash
cp .env.example .env        # add your SMTP credentials
npm install
npm start                   # http://localhost:3000
```

The local server (`serve.mjs`) handles form submissions via nodemailer + SMTP.  
On the live Apache server, PHP `mail()` is used instead — the two paths are entirely separate.

### Taking a screenshot

```bash
npm run screenshot                            # full-page screenshot of localhost:3000
npm run screenshot -- http://localhost:3000 label   # saves as screenshot-N-label.png
```

Screenshots are saved to `temporary screenshots/` (gitignored).

---

## Deploying

Push to `main`. GitHub Actions runs `.github/workflows/deploy.yml` which:

1. Checks out the repo
2. Copies only production files to a `deploy/` staging directory  
   (webp images only — originals stay local; dev files excluded)
3. SFTPs the staging directory to IONOS `/httpdocs`

Required GitHub repository secrets:

| Secret | Value |
|---|---|
| `FTP_HOST` | IONOS server hostname |
| `FTP_USERNAME` | SFTP username |
| `FTP_PASSWORD` | SFTP password |

---

## Environment variables

Copy `.env.example` to `.env` and fill in values. `.env` is gitignored and never deployed.

| Variable | Purpose |
|---|---|
| `SMTP_HOST` | SMTP server (defaults to `smtp.ionos.co.uk`) |
| `SMTP_USER` | SMTP username / sender address |
| `SMTP_PASS` | SMTP password |

---

## Form endpoints

Both endpoints accept `Content-Type: application/json` POST only. They return `{"ok": true}` on success.

| Endpoint | Handler | Sends to |
|---|---|---|
| `POST /send-message.php` | `send-message.php` | `hello@hayleycasey.co.uk` |
| `POST /send-consultation.php` | `send-consultation.php` | `consultations@hayleycasey.co.uk` |

Payload limits: 32 KB (contact form), 512 KB (consultation — signature PNG adds bulk).

---

## Key architectural decisions

**Self-hosted fonts** — Google Fonts CDN was removed to eliminate third-party latency and round-trips. Six woff2 files cover latin and latin-ext ranges for both weights used.

**PHP `mail()` on live, nodemailer locally** — IONOS shared hosting runs Apache+PHP with a working `mail()` setup. The Node dev server uses nodemailer+SMTP so forms can be tested end-to-end locally without needing Apache.

**`send-message/index.php` shims** — Some browsers cached an older version of the site that fetched `/send-message` (no `.php`). The directory shims handle that request without an `.htaccess` rewrite, so old cached pages still work.

**Cloudflare rate limiting** — A WAF rate-limiting rule blocks IPs that POST to the form endpoints more than 5 times per 10 seconds. Configured in the Cloudflare dashboard (cannot be expressed in `.htaccess` when behind Cloudflare proxy).

**webp only in production** — `brand_assets/` contains both original format files (`.jpg`/`.jpeg`/`.png`) and `.webp` conversions. Only webp files are deployed. The originals are kept locally as source material for future re-exports.
