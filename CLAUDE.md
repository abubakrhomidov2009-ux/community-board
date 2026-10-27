# CLAUDE.md: Community Board

> **At the start of every session, read this file and docs/12-PROGRESS-LOG.md and tell me in 3–5 lines what day we are on, what is done, what is next, and whether you need anything from me. You write all the code; I only test. Never start frontend work until every box of the "Backend done" gate is checked. Ask me for things in the "🙋 I NEED YOUR HELP" format, tell me when something is ready with "✅ READY TO CHECK", and end every day with a "🔍 DAILY CHECK". Explain everything in simple English.**

**Current day: 3 (Posts + Comments built; waiting for the owner's Swagger check). Next: Day 4, Uploads, Users, Favorites, Reports, expiry job.**

## Project

"Community Board": multilingual (Tajik / Russian / English) web app for local announcements in Dushanbe and the university. Categories: Lost & Found, Tutoring, Rentals, Other. One responsive codebase + installable PWA. Must be deployed and free (no paid plans, no card, no domain).

The owner is not a coder: Claude writes ALL code, installs ALL tools and packages, and the owner only creates accounts, pastes keys into `.env` files, and tests in the browser/phone. Never ask the owner to edit code. Never ask the owner to paste secrets in chat.

## Stack (fixed)

- **Frontend (`client/`)**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 (`@tailwindcss/postcss`), shadcn/ui, lucide-react, next-intl (tg/ru/en, default en), next-themes, TanStack Query + Table, Axios (one instance, `lib/api/axios.ts`, base `/api`, `withCredentials`), Zod + react-hook-form, Motion, Embla, Vaul, react-leaflet, browser-image-compression, Serwist (PWA), Jest + React Testing Library, eslint-plugin-i18next.
- **Backend (`server/`)**: NestJS 11, TypeScript, Prisma 6, PostgreSQL, JWT in httpOnly cookie (custom `JwtAuthGuard`, no Passport), bcrypt, class-validator/transformer, @nestjs/swagger 11.4.7, throttler, schedule, helmet, cookie-parser, multer + Cloudinary, Brevo via `fetch`.
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

Models: User, Post, PostImage, Comment, Favorite, Report, Notification, Conversation, ConversationParticipant, Message, EmailVerificationToken.
Enums: Role {USER, ADMIN} · Category {LOST_FOUND, TUTORING, RENTALS, OTHER} · District {SINO, FIRDAVSI, SHOHMANSUR, ISMOILI_SOMONI, UNIVERSITY_CAMPUS, OTHER} · PostStatus {ACTIVE, RESOLVED, EXPIRED, REMOVED} · PriceUnit {ONCE, PER_HOUR, PER_MONTH} · ReportReason {SPAM, SCAM, OFFENSIVE, OTHER} · ReportStatus {OPEN, RESOLVED, DISMISSED} · NotificationType {NEW_COMMENT, POST_EXPIRING, POST_REMOVED, NEW_MESSAGE} · Locale {TG, RU, EN}. Prices are whole somoni (Int).
Full schema, API and error codes: docs/02-SPEC.md.

## Decisions

- API via Next.js rewrite: browser calls `/api/...` on the frontend domain, forwarded to `API_PROXY_TARGET` (first-party cookie). CORS with credentials kept as fallback.
- Local PostgreSQL 18 (installed by owner) until day 12; Neon after. Docker Compose optional.
- Brevo with a verified Gmail sender, no domain; `MailService` hides the provider; tell users to check spam.
- Render free tier sleeps: expiry also checked on read + keep-awake workflow every 14 min.
- NestJS 11 + matching package versions; Prisma 6; uploads go through the backend.
- Backend never sends UI text, only error codes (`errors.<CODE>` on the frontend).
- Everything must be free. If a sign-up asks for a card: stop, switch to a free option.

## The 6 mandatory rules

1. **i18n from day one:** next-intl + `[locale]` before the first page; no hardcoded UI text (ESLint `no-literal-string`); en/tg/ru keys identical (`npm run i18n:check`); Zod messages are keys; backend sends error codes; enums translated (`category.LOST_FOUND`); dates/numbers/prices via formatters; emails use `preferredLocale`; PWA manifest in 3 languages.
2. **Swagger for every endpoint:** `@ApiTags`, `@ApiOperation`, `@ApiResponse` for each status, documented DTOs with examples, response DTOs, cookie auth, multipart docs for uploads, query docs. A feature is not done until it works in Swagger. Frontend types are generated from `/api/docs-json`.
3. **Real UI design:** follow docs/11-DESIGN-SYSTEM.md (tokens, Inter with Cyrillic, lucide only, shadcn restyled, designed states, real dark palette, no AI-slop).
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

| Day | Stage  | Work                                                        | Features         |
| --- | ------ | ----------------------------------------------------------- | ---------------- |
| 1   | Setup  | tools, scaffolds, docs                                      | –                |
| 2   | A      | schema, migrations, seed, errors, Auth, guards              | 1                |
| 3   | A      | Posts, Comments                                             | 2–6, 8–11, 14    |
| 4   | A      | Uploads, Users, Favorites, Reports, expiry job              | 15, 17–20        |
| 5   | A      | Admin, Notifications, Email, Map fields, Rate limits        | 22–25, 27        |
| 6   | A      | Messages, unit + e2e tests                                  | 26               |
| 7   | A gate | Swagger review, spec sync, tag `api-v1.0.0`                 | all              |
| 8   | B      | API types, i18n, tokens, logo, shell, auth pages            | 1, 12            |
| 9   | B      | Browse, detail, comments, create/edit + photos              | 2–11, 14, 15     |
| 10  | B      | Profiles, saved, report, share, renew, About, notifications | 7, 13, 17–21, 23 |
| 11  | B      | Admin, messages, map, student verification, PWA, tg+ru      | 16, 22, 24–26    |
| 12  | C      | Deploy (GitHub, Neon, Render, Vercel)                       | –                |
| 13  | C      | Production fixes, phone tests, Lighthouse                   | –                |
| 14  | C      | Final check of all 27, README screenshots                   | all              |

Needs from the owner: day 4 Cloudinary keys · day 5 Brevo key + verified Gmail · days 8, 11 phone on the same Wi-Fi · day 12 GitHub/Neon/Render/Vercel accounts · day 13 phone with the live link.

## Feature progress (two boxes: backend done / frontend done)

| #   | Feature                                     | Backend                            | Frontend |
| --- | ------------------------------------------- | ---------------------------------- | -------- |
| 1   | Register / login / logout, unique username  | [x]                                | [ ]      |
| 2   | Create, edit, delete own posts              | [x]                                | [ ]      |
| 3   | Categories                                  | [x]                                | [ ]      |
| 4   | Browse: category filter, search, pagination | [x]                                | [ ]      |
| 5   | Comments                                    | [x]                                | [ ]      |
| 6   | Post detail + mark as resolved              | [x]                                | [ ]      |
| 7   | My profile with my posts                    | [x]                                | [ ]      |
| 8   | Price + unit                                | [x]                                | [ ]      |
| 9   | District + filter                           | [x]                                | [ ]      |
| 10  | Contact options (Telegram / phone)          | [x]                                | [ ]      |
| 11  | Sort options                                | [x]                                | [ ]      |
| 12  | Dark mode                                   | n/a                                | [ ]      |
| 13  | About page                                  | n/a                                | [ ]      |
| 14  | Post count per category                     | [x]                                | [ ]      |
| 15  | Images on posts                             | [ ]                                | [ ]      |
| 16  | Three languages                             | [ ] (error codes, email templates) | [ ]      |
| 17  | Favorites / Saved                           | [ ]                                | [ ]      |
| 18  | Public user profile                         | [ ]                                | [ ]      |
| 19  | Post expiry + renew                         | [ ]                                | [ ]      |
| 20  | Report button                               | [ ]                                | [ ]      |
| 21  | Share button                                | n/a                                | [ ]      |
| 22  | Admin role and panel                        | [ ]                                | [ ]      |
| 23  | In-app notifications                        | [ ]                                | [ ]      |
| 24  | University email verification               | [ ]                                | [ ]      |
| 25  | Map (pin + map view)                        | [ ]                                | [ ]      |
| 26  | Private messages                            | [ ]                                | [ ]      |
| 27  | Rate limiting; blocked users                | [ ]                                | [ ]      |

## "Backend done" gate (all must be checked before ANY frontend work)

- [ ] Every endpoint in docs/02-SPEC.md exists, works and is documented in Swagger with examples and every response code
- [ ] Every error code in docs/02-SPEC.md is returned by the backend where expected
- [ ] All backend unit and e2e tests pass
- [ ] `npm run db:seed` (in `server/`) loads the seed data
- [ ] docs/02-SPEC.md matches the real API
- [ ] Owner did the day-7 big check in Swagger and all bugs are fixed
- [ ] `git tag api-v1.0.0`

If the frontend finds a backend gap: write a "backend change request" in docs/03-ROADMAP.md, fix it in `server/` with a test, update Swagger and docs/02-SPEC.md, bump the tag (`api-v1.0.1`), run `npm run api:types`, continue.

## Coding rules (short; full list in docs/07-CODING-STANDARDS.md)

- Conventional Commits; run `npm run lint` before committing; never skip hooks.
- Backend: DTO + response DTO for every endpoint; services hold rules and throw `AppException(ErrorCode, status)`; ownership checks in services; never return `passwordHash`.
- Frontend: all server data through TanStack Query hooks in `features/<feature>/{api,queries,mutations}.ts`; query key factories; types from `schema.d.ts`; no guessed shapes; no hardcoded text; mobile-first Tailwind; tokens only.
- Secrets only in `server/.env` and `client/.env.local` (git-ignored).
- Don't add features beyond the spec; don't change the fixed stack.
