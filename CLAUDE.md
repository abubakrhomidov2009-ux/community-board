#[x]|CLAUDE.md:[x]|Community[x]|Board[x]|[x]|[x]|[x]|[x]|[x]|[x]|[x]|[x]|[x]|[x]|

> **At the start of every session, read this file and docs/12-PROGRESS-LOG.md and tell me in 3–5 lines what day we are on, what is done, what is next, and whether you need anything from me. You write all the code; I only test. Never start frontend work until every box of the "Backend done" gate is checked. Ask me for things in the "🙋 I NEED YOUR HELP" format, tell me when something is ready with "✅ READY TO CHECK", and end every day with a "🔍 DAILY CHECK". Explain everything in simple English.**

**Current day: 11 is finished (built and browser-tested; waiting for the owner big check on laptop + phone, 3 languages). Next: Day 12 (deploy), only when the owner says go. The logo is at `docs/design/logo.png`, the design canvas files at `docs/design/canvas/` (canvas link: https://claude.ai/artifact/LZnqH7GxYFAvqZPdfcrrGC).**

## Plan update (2026-10-28), applies everywhere

- **About is the front door.** A guest only sees `/[locale]/about` (also `/[locale]`). Every other link shows About with the Log in modal open, then returns to that link after login. Backend: only `GET /api/health` and the auth endpoints are public; everything else needs a login. **No `/login` or `/register` pages**: Log in and Create account are one modal (bottom sheet on phones); after login go to Home (`/posts`); logout goes to About.
- **Sessions.** Login token (cookie `access_token`, 15 min) + rotating refresh token (cookie `refresh_token`, 30 days, path `/api/auth`). The Axios interceptor calls `POST /api/auth/refresh` once on 401 `UNAUTHORIZED`, then repeats the request; on 401 `REFRESH_TOKEN_INVALID` it opens the Log in modal.
- **Profile.** `PATCH /api/users/me` (username, language), `POST /api/auth/change-password`, `POST` / `DELETE /api/users/me/avatar`, logout on the profile page.
- **Roles.** `Role` = USER, ADMIN, SUPER_ADMIN. Nobody picks a role. Exactly one super admin: the email `SUPER_ADMIN_EMAIL` in `server/.env` (password `SUPER_ADMIN_PASSWORD`; the server and the seed create or upgrade it). Admins block only normal users; only the super admin touches admins (`PATCH /api/admin/users/:id/promote|demote|block|unblock`); nobody changes the super admin. Student ✓ is a flag, not a role. Errors: `FORBIDDEN_ROLE`, `CANNOT_CHANGE_SUPER_ADMIN`, `USER_ALREADY_ADMIN`, `USER_NOT_ADMIN`. Admin actions are `PATCH`. Admin pages: `/admin/posts/[id]` and `/admin/users/[id]` (API: `GET /api/admin/posts/:id`, `GET /api/admin/users/:id`, `PATCH /api/admin/posts/:id/reports/dismiss`).
- **Design v2 "Notice Slips".** Build exactly like the design canvas (see docs/11 §0): dotted board, slips with amber pin, category strip, tear-off tabs, stamps; fonts Unbounded + Onest; light + dark tokens (Light / Dark / System); round logo from `docs/design/logo.png`; every READY TO CHECK names the artboards to compare with. If the canvas or logo cannot be read, ask the owner (🙋 format) to export the design or put screenshots / the logo in `docs/design/`.

## Frontend facts (learned in step 1)

- **Next.js 16: `middleware.ts` is called `proxy.ts`** (`client/src/proxy.ts`: language redirect + guest guard). Read `client/node_modules/next/dist/docs/` before using a Next API. Never delete `client/.next` while a dev server runs.
- **Guest guard** uses a small cookie `cb_session` (set by the frontend after login, no secret). The real `refresh_token` cookie has `Path=/api/auth`, so the proxy cannot see it. A guest makes no `/auth/me` request at all (no red 401 lines in the console).
- **Fonts are saved in `client/public/fonts`** (`node scripts/fetch-fonts.mjs` re-creates them): Google downloads timed out in dev mode on this PC and broke the pages. **Unbounded has no Tajik letters** (ғ ӣ қ ӯ ҳ ҷ), Onest has: in Tajik the headings use Onest bold; the wordmark `community board` stays Unbounded (`font-brand`).
- **Pages are lazy:** the auth modal (forms, validation, sheet) is downloaded only when needed and prefetched when the browser is idle; devtools only in dev. Every page has a skeleton (`loading.tsx`), never a spinner.
- Checks: `npm run typecheck`, `npm run lint` (includes the no-hard-coded-text rule), `npm test`, `npm run i18n:check`, `npm run preview` (production build, fast; dev mode compiles each page on first visit, which is slow on this PC).
- `/posts` is the real Home board (step 2). Theme is our own `src/providers/theme.tsx` (not next-themes). Local `DATABASE_URL` needs `connection_limit=20&pool_timeout=30` (see docs/12). Never run browser checks right after editing files in dev mode: Fast Refresh reloads cause fake hydration errors.

## Project

"Community Board": multilingual (Tajik / Russian / English) web app for local announcements in Dushanbe and the university. Categories: Lost & Found, Tutoring, Rentals, Other. One responsive codebase + installable PWA. Must be deployed and free (no paid plans, no card, no domain).

The owner is not a coder: Claude writes ALL code, installs ALL tools and packages, and the owner only creates accounts, pastes keys into `.env` files, and tests in the browser/phone. Never ask the owner to edit code. Never ask the owner to paste secrets in chat.

## Stack (fixed)

- **Frontend (`client/`)**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 (`@tailwindcss/postcss`), shadcn/ui, lucide-react, fonts Unbounded + Onest (`next/font/google`), next-intl (tg/ru/en, default en), next-themes (Light / Dark / System), TanStack Query + Table, Axios (one instance, `lib/api/axios.ts`, base `/api`, `withCredentials`), Zod + react-hook-form, Motion, Embla, Vaul, react-leaflet, browser-image-compression, Serwist (PWA), Jest + React Testing Library, eslint-plugin-i18next.
- **Backend (`server/`)**: NestJS 11, TypeScript, Prisma 6, PostgreSQL, JWT access cookie + rotating refresh-token cookie (custom `JwtAuthGuard`, no Passport), bcrypt, class-validator/transformer, @nestjs/swagger 11.4.7, throttler, schedule, helmet, cookie-parser, multer + Cloudinary, Brevo via `fetch`.
- **Hosting (free)**: Neon (DB), Render (API), Vercel (web), Cloudinary, Brevo, OpenStreetMap, GitHub Actions.
- npm only. Package versions and install notes: docs/05-SETUP-GUIDE.md. Client installs use `--legacy-peer-deps`.

## Commands

| Command                                                              | Where     | What                                            |
| -------------------------------------------------------------------- | --------- | ----------------------------------------------- |
| `npm run dev`                                                        | root      | both apps (web :3000, API :4000)                |
| `npm run lint` / `npm test` / `npm run build` / `npm run format`     | root      | all                                             |
| `npx prisma migrate dev` / `npx prisma generate` / `npm run db:seed` | `server/` | database                                        |
| `npm run api:types`                                                  | `client/` | generate `src/lib/api/schema.d.ts` from Swagger |
| `npm run i18n:check`                                                 | `client/` | compare en/tg/ru keys                           |

URLs: web http://localhost:3000 · health http://localhost:4000/api/health · Swagger http://localhost:4000/api/docs · docs JSON `/api/docs-json`. Phone: `http://<computer IP>:3000` (currently 192.168.31.166).

## Folder tree

```
Community-Board/
├── client/        Next.js: messages/ (en,tg,ru.json), public/, src/{app/[locale]/..., components/{ui,layout,shared}, features/<feature>/{api,queries,mutations,schemas,components}, i18n/, lib/{api,query-client,motion,utils}, middleware.ts}
├── server/        NestJS: prisma/{schema.prisma,migrations,seed.ts}, src/{main.ts,app.module.ts,common/,config/,prisma/,modules/<module>/{module,controller,service,service.spec,dto/}}, test/ (e2e)
├── docs/          01-TZ … 12-PROGRESS-LOG
├── .github/workflows/  ci.yml, keep-awake.yml
├── docker-compose.yml  package.json  .prettierrc  .gitignore  README.md  CLAUDE.md
```

Full annotated tree: docs/02-SPEC.md §2. One Git repo at the root only. Backend code only in `server/`, frontend only in `client/`.

## Data model names (use everywhere)

Models: User, Post, PostImage, Comment, Favorite, Report, Notification, Conversation, ConversationParticipant, Message, EmailVerificationToken, RefreshToken.
Enums: Role {USER, ADMIN, SUPER_ADMIN} · Category {LOST_FOUND, TUTORING, RENTALS, OTHER} · District {SINO, FIRDAVSI, SHOHMANSUR, ISMOILI_SOMONI, UNIVERSITY_CAMPUS, OTHER} · PostStatus {ACTIVE, RESOLVED, EXPIRED, REMOVED} · PriceUnit {ONCE, PER_HOUR, PER_MONTH} · ReportReason {SPAM, SCAM, OFFENSIVE, OTHER} · ReportStatus {OPEN, RESOLVED, DISMISSED} · NotificationType {NEW_COMMENT, POST_EXPIRING, POST_REMOVED, NEW_MESSAGE} · Locale {TG, RU, EN}. Prices are whole somoni (Int).
Full schema, API and error codes: docs/02-SPEC.md.

## Decisions

- API via Next.js rewrite: browser calls `/api/...` on the frontend domain, forwarded to `API_PROXY_TARGET` (first-party cookie). CORS with credentials kept as fallback.
- Local PostgreSQL 18 (installed by owner) until day 12; Neon after. Docker Compose optional.
- Brevo with a verified Gmail sender, no domain; `MailService` hides the provider; tell users to check spam.
- Render free tier sleeps: expiry also checked on read + keep-awake workflow every 14 min.
- NestJS 11 + matching package versions; Prisma 6; uploads go through the backend.
- Backend never sends UI text, only error codes (`errors.<CODE>` on the frontend).
- Login-only site (About is the only public page); roles USER / ADMIN / SUPER_ADMIN; short access token + rotating refresh token (plan update above).
- Everything must be free. If a sign-up asks for a card: stop, switch to a free option.

## The 6 mandatory rules

1. **i18n from day one:** next-intl + `[locale]` before the first page; no hardcoded UI text (ESLint `no-literal-string`); en/tg/ru keys identical (`npm run i18n:check`); Zod messages are keys; backend sends error codes; enums translated (`category.LOST_FOUND`); dates/numbers/prices via formatters; emails use `preferredLocale`; PWA manifest in 3 languages.
2. **Swagger for every endpoint:** `@ApiTags`, `@ApiOperation`, `@ApiResponse` for each status, documented DTOs with examples, response DTOs, cookie auth, multipart docs for uploads, query docs. A feature is not done until it works in Swagger. Frontend types are generated from `/api/docs-json`.
3. **Real UI design:** follow docs/11-DESIGN-SYSTEM.md section 0 ("Notice Slips": tokens, Unbounded + Onest, round logo, slips, stamps, lucide only, shadcn restyled, designed states, real dark palette, no AI-slop) and match the design canvas artboards exactly.
4. **Laptop AND mobile, both first-class:** mobile-first 360px; tablet 768; desktop 1024+ (max ~1280); bottom tab bar, bottom sheets, ≥44px targets, 16px inputs, safe area, camera upload, tap-to-call, share sheet; PWA; every READY TO CHECK has mobile and laptop steps.
5. **Backend first, then frontend, deploy near the end:** Stage A days 2–7 (all 27 features, Swagger-tested), gate, then Stage B days 8–11, then Stage C days 12–14.
6. **Motion:** Motion lib + tw-animate-css + Embla + Vaul; tokens `--duration-*`, `--ease-out`; presets in `client/src/lib/motion.ts`; transform/opacity only; `MotionConfig reducedMotion="user"`; motion table in docs/11.

## Working with the owner

Simple English, short sentences. Ask only when needed, in this exact format:

```
🙋 I NEED YOUR HELP
What: <one line>
Why: <one line>
Steps:
  1. <exact click-by-click step, with link>
Where to put it: <exact file and line, e.g. "server/.env, line CLOUDINARY_API_KEY=">
Tell me "done" when finished.
```

When something is finished:

```
✅ READY TO CHECK: <what> (features <numbers>)
Open: <exact URL>
Check these steps:
  1. <action> → you should see: <result>
On your phone: <steps or "not needed for this one">
If something is wrong, tell me: Bug: <page> / I did: <...> / I expected: <...> / I got: <...>
```

End of every day: `🔍 DAILY CHECK` (10–20 minutes, numbered steps with expected results). Wait for results before the next day; fix reported bugs first (repeat the bug in one line, find the cause, fix, add a test, explain simply, give re-check steps). Big checks: day 7 (backend in Swagger), 11 (frontend, laptop + phone, 3 languages), 13 (live site), 14 (all 27 features), using docs/08-TESTING-CHECKLIST.md.
Never ask the owner to paste secrets in chat: tell them which file/line. Verify the app can read keys without printing them. Keep docs/12-PROGRESS-LOG.md updated daily and tick the boxes below. Commit with Conventional Commits at the end of each feature group; push to GitHub only on day 12. If behind schedule, say so and propose the cut list (26 → 25 → 24) — never cut without the owner's OK; never cut features 1–21.

## 14-day plan (details: docs/04-DAILY-PLAN.md)

| Day | Stage  | Work                                                          | Features         |
| --- | ------ | ------------------------------------------------------------- | ---------------- |
| 1   | Setup  | tools, scaffolds, docs                                        | –                |
| 2   | A      | schema, migrations, seed, errors, Auth, guards                | 1                |
| 3   | A      | Posts, Comments                                               | 2–6, 8–11, 14    |
| 4   | A      | Uploads, Users, Favorites, Reports, expiry job                | 15, 17–20        |
| 5   | A      | Admin, Notifications, Email, Map fields, Rate limits          | 22–25, 27        |
| 6   | A      | Messages, unit + e2e tests                                    | 26               |
| 7   | A gate | Swagger review, spec sync, tag `api-v1.0.0`                   | all              |
| 8   | B      | API types, i18n, tokens, logo, shell, About page + auth modal | 1, 12, 13        |
| 9   | B      | Browse, detail, comments, create/edit + photos                | 2–11, 14, 15     |
| 10  | B      | Profiles, saved, report, share, renew, About, notifications   | 7, 13, 17–21, 23 |
| 11  | B      | Admin, messages, map, student verification, PWA, tg+ru        | 16, 22, 24–26    |
| 12  | C      | Deploy (GitHub, Neon, Render, Vercel)                         | –                |
| 13  | C      | Production fixes, phone tests, Lighthouse                     | –                |
| 14  | C      | Final check of all 27, README screenshots                     | all              |

Needs from the owner: day 4 Cloudinary keys · day 5 Brevo key + verified Gmail · day 7 SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASSWORD in server/.env · day 8 docs/design/logo.png + the design canvas export (if Claude cannot read it) · days 8, 11 phone on the same Wi-Fi · day 12 GitHub/Neon/Render/Vercel accounts · day 13 phone with the live link.

## Feature progress (two boxes: backend done / frontend done)

| #   | Feature                                     | Backend                            | Frontend |
| --- | ------------------------------------------- | ---------------------------------- | -------- |
| 1   | Register / login / logout, unique username  | [x]                                | [x]      |
| 2   | Create, edit, delete own posts              | [x]                                | [x]      |
| 3   | Categories                                  | [x]                                | [x]      |
| 4   | Browse: category filter, search, pagination | [x]                                | [x]      |
| 5   | Comments                                    | [x]                                | [x]      |
| 6   | Post detail + mark as resolved              | [x]                                | [x]      |
| 7   | My profile with my posts                    | [x]                                | [x]      |
| 8   | Price + unit                                | [x]                                | [x]      |
| 9   | District + filter                           | [x]                                | [x]      |
| 10  | Contact options (Telegram / phone)          | [x]                                | [x]      |
| 11  | Sort options                                | [x]                                | [x]      |
| 12  | Dark mode                                   | n/a                                | [x]      |
| 13  | About page                                  | n/a                                | [x]      |
| 14  | Post count per category                     | [x]                                | [x]      |
| 15  | Images on posts                             | [x]                                | [x]      |
| 16  | Three languages                             | [x] (error codes, email templates) | [x]      |
| 17  | Favorites / Saved                           | [x]                                | [x]      |
| 18  | Public user profile                         | [x]                                | [x]      |
| 19  | Post expiry + renew                         | [x]                                | [x]      |
| 20  | Report button                               | [x]                                | [x]      |
| 21  | Share button                                | n/a                                | [x]      |
| 22  | Admin role and panel                        | [x]                                | [x]      |
| 23  | In-app notifications                        | [x]                                | [x]      |
| 24  | University email verification               | [x]                                | [x]      |
| 25  | Map (pin + map view)                        | [x]                                | [x]      |
| 26  | Private messages                            | [x]                                | [x]      |
| 27  | Rate limiting; blocked users                | [x]                                | [x]      |

## "Backend done" gate (all must be checked before ANY frontend work)

- [x] Every endpoint in docs/02-SPEC.md exists, works and is documented in Swagger with examples and every response code (56 = 56, checked by an audit script and a test)
- [x] Every error code in docs/02-SPEC.md is returned by the backend where expected (44 codes; a test keeps the spec table equal to the code)
- [x] All backend unit and e2e tests pass (230 unit, 105 e2e)
- [x] `npm run db:seed` (in `server/`) loads the seed data
- [x] docs/02-SPEC.md matches the real API
- [x] Login-only access verified (guests get 401 everywhere except health and auth); roles matrix + super admin from server/.env verified
- [x] Day-7 big check in Swagger: on 2026-10-28 the owner told Claude to finish day 7, so Claude ran the whole owner checklist (docs/08 Part A) against the live server: 31 of 31 checks passed, no bugs. The owner can still try Swagger any time and report bugs.
- [x] `git tag api-v1.0.0`

If the frontend finds a backend gap: write a "backend change request" in docs/03-ROADMAP.md, fix it in `server/` with a test, update Swagger and docs/02-SPEC.md, bump the tag (`api-v1.0.1`), run `npm run api:types`, continue.

## Coding rules (short; full list in docs/07-CODING-STANDARDS.md)

- Conventional Commits; run `npm run lint` before committing; never skip hooks.
- Backend: DTO + response DTO for every endpoint; services hold rules and throw `AppException(ErrorCode, status)`; ownership checks in services; never return `passwordHash`.
- Frontend: all server data through TanStack Query hooks in `features/<feature>/{api,queries,mutations}.ts`; query key factories; types from `schema.d.ts`; no guessed shapes; no hardcoded text; mobile-first Tailwind; tokens only.
- Secrets only in `server/.env` and `client/.env.local` (git-ignored).
- Don't add features beyond the spec; don't change the fixed stack.
