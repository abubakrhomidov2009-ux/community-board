# 06. Deployment (day 12)

Everything here uses **free plans only**. If any page asks for a credit card, **stop** and tell Claude; we switch to another free option. Check each free plan again on the day (limits can change).

Order: GitHub → Neon → Render → Vercel → connect → keep-awake → checks.

## 1. GitHub (repository + push)

1. Go to https://github.com and sign in (or create a free account).
2. Click **+** (top right) → **New repository**. Name: `community-board`. Choose **Public** (GitHub Actions are free for public repos). Do **not** add a README, .gitignore or license. Click **Create repository**.
3. Tell Claude the repository URL. Claude runs:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<you>/community-board.git
   git push -u origin main --tags
   ```
   (A browser window may ask you to sign in to GitHub: approve it.)

## 2. Neon (database)

1. Go to https://neon.tech → **Sign in with GitHub**.
2. **Create project**: name `community-board`, pick the region closest to Dushanbe (Frankfurt is fine), Postgres 16 or newer.
3. On the dashboard click **Connect** and copy the connection string (starts with `postgresql://`; make sure it ends with `?sslmode=require`).
4. Paste it into `server/.env` on a new line `NEON_DATABASE_URL=` (never in chat). Claude uses it to run migrations and the seed on Neon.
5. Claude runs: `npx prisma migrate deploy` then the seed (only demo content; production admin password is changed, see below).

Note: Neon free databases sleep when unused; the first request wakes them (a second or two).

## 3. Render (NestJS backend)

1. Go to https://render.com → **Sign in with GitHub**.
2. **New +** → **Web Service** → connect the `community-board` repository.
3. Settings:
   - Name: `community-board-api`
   - Region: same as Neon
   - Root Directory: `server`
   - Runtime: Node
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start Command: `npm run start:prod`
   - Instance type: **Free**
   - Health Check Path: `/api/health`
4. **Environment variables** (Environment tab):
   - `NODE_ENV=production`
   - `DATABASE_URL=` the Neon string
   - `JWT_SECRET=` a new long random string (Claude generates it; you paste it)
   - `JWT_EXPIRES_IN=7d`
   - `CLIENT_URL=` your Vercel URL (add after step 4)
   - `SITE_URL=` your Vercel URL
   - `COOKIE_SAMESITE=lax`
   - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - Brevo: `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`
5. Click **Create Web Service**. Wait for "Live". Open `https://<name>.onrender.com/api/health` → `{"status":"ok"}`, and `/api/docs` for Swagger.

**Cold start:** the free service sleeps after about 15 minutes without traffic; the first request can take 30–60 seconds. The keep-awake workflow (step 6) reduces this.

## 4. Vercel (Next.js frontend)

1. Go to https://vercel.com → **Sign Up** with GitHub, choose **Hobby** (free, personal).
2. **Add New → Project** → import `community-board`.
3. **Root Directory:** click Edit and select `client`. Framework: Next.js (detected).
4. **Environment variables:**
   - `API_PROXY_TARGET=https://<name>.onrender.com`
   - `NEXT_PUBLIC_SITE_URL=https://<project>.vercel.app`
5. Click **Deploy**. When done, copy the URL, then go back to Render and set `CLIENT_URL` and `SITE_URL` to it. Redeploy Render (Manual Deploy).
6. Open `https://<project>.vercel.app/en` and `https://<project>.vercel.app/api/health` (the proxy must return `{"status":"ok"}`).

## 5. Cloudinary and Brevo in production

- Use the same free keys as local (or create separate ones) and enter them in Render's environment variables.
- Brevo: your Gmail must still be a **verified sender**. Emails may land in spam; the verification page tells users to check spam.
- Free limits: Brevo about 300 emails per day. Cloudinary free storage/bandwidth credits. If a limit is reached, Claude tells you in one line and applies a free fix.

## 6. Keep-awake workflow

`.github/workflows/keep-awake.yml` runs every 14 minutes and calls `GET https://<name>.onrender.com/api/health`. The URL is stored as a GitHub **repository variable** `API_HEALTH_URL`: GitHub → repository → Settings → Secrets and variables → Actions → **Variables** → New variable. One always-on free service fits inside Render's free monthly hours. (Also, posts past `expiresAt` are treated as expired when read, so the result is correct even when the cron job slept.)

## 7. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push and pull request: install, lint, test and build for both apps (with a temporary PostgreSQL service for e2e tests).

## 8. Production security

- **Rate limits need the real visitor IP.** The backend counts requests per IP address. Behind Vercel (the `/api` proxy) and Render, the IP the server sees can be Vercel's, which would make all visitors share one limit (for example 5 logins per minute for everybody). On day 12/13 Claude changes the rate-limit tracker to use the first address in the `X-Forwarded-For` header (Vercel sets it to the real visitor IP) and tests it with two devices. `THROTTLE_DISABLED` must never be set in production.

- Change demo passwords. Do not leave `Admin12345` on a live site: create the real admin by running the seed's admin step with a new password from an env variable (`SEED_ADMIN_PASSWORD`), or change it with an SQL update through Neon's SQL editor.
- Never commit `.env`. Rotate any key that was shown in a chat or screenshot.

## 9. Post-deploy checklist

- [ ] `https://<vercel>/en` loads
- [ ] `https://<vercel>/api/health` returns ok (proxy works)
- [ ] `https://<render>/api/docs` shows Swagger
- [ ] Register, log in, stay logged in after refresh (cookie works)
- [ ] Create a post with a photo
- [ ] Change language to `tg` and `ru`
- [ ] Dark mode works without flash
- [ ] Verification email arrives (check spam)
- [ ] App installs on a phone (Android: "Install app"; iPhone: Share → Add to Home Screen)
- [ ] Offline page shows when the phone is in airplane mode
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90
- [ ] Keep-awake workflow ran at least once (GitHub → Actions)

## 10. Troubleshooting

| Problem                                                        | Cause                                                                     | Fix                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CORS error in the browser console                              | Browser calls Render directly, or `CLIENT_URL` wrong                      | Use the `/api` proxy (Axios base `/api`); set `CLIENT_URL` exactly to the Vercel URL, no trailing slash                                                                                                                                                      |
| Login works but you are logged out on refresh (cookie not set) | `secure` cookie behind a proxy without `trust proxy`; or wrong `SameSite` | Check `app.set('trust proxy', 1)`; keep `COOKIE_SAMESITE=lax` with the proxy; clear site cookies                                                                                                                                                             |
| Cookies blocked on iPhone Safari                               | Cross-domain (third-party) cookies                                        | Use the proxy (first-party). Do not call Render directly from the browser                                                                                                                                                                                    |
| 401 on every request                                           | Cookie missing or `JWT_SECRET` changed                                    | Log in again; check the secret is the same after redeploy                                                                                                                                                                                                    |
| `502` / `504` on first visit                                   | Render free server is waking up                                           | Wait up to a minute and retry; keep-awake workflow                                                                                                                                                                                                           |
| Migration failed on deploy                                     | Wrong `DATABASE_URL` or no `?sslmode=require`; schema drift               | Run `npx prisma migrate status`; use `migrate deploy` (not `dev`) in production                                                                                                                                                                              |
| Prisma "can't reach database"                                  | Neon asleep or paused                                                     | Retry; check the connection string; use the pooled connection string if offered                                                                                                                                                                              |
| Image upload fails                                             | Wrong Cloudinary keys; file over 5 MB; request body too large via proxy   | Check keys in Render; compress in the browser; check Vercel proxy limits (Vercel limits request bodies to about 4.5 MB: if uploads fail, the image compression step must produce files under ~4 MB, or call Render directly for uploads, see the note below) |
| Emails do not arrive                                           | Brevo key wrong, sender not verified, spam folder                         | Check Brevo logs (Transactional → Logs); verify sender; check spam                                                                                                                                                                                           |
| Expiry job did not run                                         | Free server was asleep                                                    | Expiry is also checked on read; keep-awake workflow                                                                                                                                                                                                          |
| The site shows an old version                                  | Service worker cache                                                      | Bump the Serwist revision, "new version" toast, hard refresh, or Application → Service Workers → Unregister                                                                                                                                                  |

**Upload size note:** Vercel rewrites limit the request body (about 4.5 MB). Because the browser compresses each image to well under 1.5 MB first, uploads of up to 5 images are sent one request per image, which stays under the limit. If this still fails, Claude documents and uses the fallback (direct call to Render with CORS + `SameSite=None`).
