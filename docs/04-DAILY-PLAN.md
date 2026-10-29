# 04. Daily Plan (14 days)

Every day ends with a `🔍 DAILY CHECK` for the owner. The next day starts only after the owner reports results. Bugs are fixed first.

**Definition of done (every day):** Swagger works for every new endpoint (all status codes documented) · pages work at 360px and 1280px · no hardcoded text · translation keys present in en/tg/ru · tests pass · `npm run lint` passes · progress log and CLAUDE.md checkboxes updated · committed.

**Plan update (2026-10-28).** (1) The site is login-only: About is the only public page, login/sign-up are a modal. (2) Profile editing (username, password, picture) and refresh tokens are in the backend. (3) Roles USER / ADMIN / SUPER_ADMIN, admin post and user pages. (4) New design "Notice Slips" with Unbounded + Onest fonts, the round logo and a light/dark token set (docs/11). The backend parts were built on Day 7 before the gate; the frontend parts are in days 8–11 below.

---

## Day 1: Setup (Step 1 + Step 2)

- **Goal:** working monorepo + all documentation.
- **Tasks**
  - [x] Check/install Node, Git, PostgreSQL; VS Code extensions
  - [x] `git init`, root `package.json`, Husky, lint-staged, Prettier
  - [x] Scaffold `server/` (NestJS) and `client/` (Next.js), install all packages, shadcn init
  - [x] Local database `community_board`, `server/.env`
  - [x] Health endpoint, Swagger, `/api` proxy
  - [x] First commit
  - [ ] Write README and docs 01–12, CLAUDE.md
- **Features:** none
- **Needs from owner:** click "Yes" on pop-ups; name/email for Git (done)
- **Check:** open `http://localhost:3000`, `http://localhost:4000/api/health`, `http://localhost:4000/api/docs`; skim README.md
- **Commits:** `chore: set up monorepo with NestJS server and Next.js client`, `docs: add project documentation`

## Day 2: Schema + Auth (feature 1)

- **Goal:** full database and working login.
- **Tasks**
  - [ ] Write the complete `prisma/schema.prisma` (docs/02 §3.1)
  - [ ] `npx prisma migrate dev --name init`
  - [ ] `PrismaService`, `ConfigModule` with env validation
  - [ ] `common/`: `ErrorCode`, `AppException`, `AllExceptionsFilter`, `ErrorResponseDto`, `PaginationQueryDto`
  - [ ] Auth module: register, login, logout, me; `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`
  - [ ] Swagger: `addCookieAuth('access_token')`, `@nestjs/swagger` CLI plugin in `nest-cli.json`
  - [ ] Seed script skeleton: admin + demo users
  - [ ] Unit tests: `AuthService`
- **Files:** `server/prisma/schema.prisma`, `server/prisma/seed.ts`, `server/src/common/**`, `server/src/modules/auth/**`, `server/src/modules/users/**`, `server/src/prisma/**`
- **Commands:** `npx prisma migrate dev`, `npx prisma generate`, `npm run db:seed`, `npm test`
- **Needs from owner:** nothing
- **READY TO CHECK:** Auth in Swagger
- **DAILY CHECK:** register → login (cookie set) → `GET /auth/me` → logout → `/auth/me` returns 401; duplicate email returns `EMAIL_TAKEN`; wrong password returns `INVALID_CREDENTIALS`
- **Commits:** `feat(db): add prisma schema and initial migration`, `feat(auth): add register, login, logout and me`

## Day 3: Posts + Comments (features 2–6, 8–11, 14)

- **Goal:** the core of the product in the API.
- **Tasks**
  - [ ] Posts: create, edit, delete, get, list with `q`, `category`, `district`, price range, `sort`, pagination
  - [ ] `GET /posts/counts`, `GET /posts/mine`
  - [ ] Rules: `CONTACT_REQUIRED`, `PRICE_NOT_ALLOWED`, `PRICE_UNIT_REQUIRED`, owner checks, `expiresAt = +30 days`
  - [ ] Resolve; expire-on-read filter
  - [ ] Comments: list, create, delete
  - [ ] `NotBlockedGuard` on create endpoints
  - [ ] Unit tests: `PostsService`, `CommentsService`
- **Needs from owner:** nothing
- **DAILY CHECK:** create posts in each category; filter by category/district; search; sort; counts; comment; delete someone else's comment (expect 403); resolve
- **Commits:** `feat(posts): add post CRUD, filters, sort and counts`, `feat(comments): add comments`

## Day 4: Uploads, Users, Favorites, Reports, Expiry (features 15, 17–20)

- **Goal:** media and community features.
- **Tasks**
  - [ ] **Ask owner for Cloudinary keys** (cloud name, API key, API secret → `server/.env`)
  - [ ] Uploads module (multer memory, Cloudinary, checks), delete files on post delete
  - [ ] Public profile endpoints
  - [ ] Favorites (PUT/DELETE/list), `isFavorite` in post responses
  - [ ] Reports (unique per user/post)
  - [ ] Tasks: expiry cron + expiry-warning; renew endpoint
  - [ ] Unit tests for each service
- **Needs from owner:** Cloudinary account and 3 keys
- **DAILY CHECK:** upload 1 and 6 photos (expect `IMAGE_LIMIT_EXCEEDED`); upload a .gif (expect `IMAGE_TYPE_INVALID`); favorite; report twice (expect `REPORT_ALREADY_EXISTS`); renew
- **Commits:** `feat(uploads): upload post images to Cloudinary`, `feat(favorites): add favorites`, `feat(reports): add reports`, `feat(tasks): add post expiry job and renew`

## Day 5: Admin, Notifications, Email, Rate limits (features 22–25, 27)

- **Tasks**
  - [ ] **Ask owner for Brevo API key** + verified Gmail sender
  - [ ] Notifications module + creation from comments, expiry, admin removal
  - [ ] Admin module (stats, reports, posts, users, block/unblock, remove/restore)
  - [ ] Mail module (Brevo) with TG/RU/EN templates; university email request + verify
  - [ ] Map fields validated and `GET /posts/map`
  - [ ] `@nestjs/throttler` global + per-route limits
  - [ ] Blocked users refused everywhere
- **Needs from owner:** Brevo account, API key, verified sender
- **DAILY CHECK:** log in as admin, remove a post, see notification as the author; block a user and try to log in; request a verification email and click the link; trigger 429 on login
- **Commits:** `feat(admin): add admin endpoints`, `feat(notifications): add notifications`, `feat(mail): add Brevo mail service and university email verification`, `feat(security): add rate limiting`

## Day 6: Messages + tests (feature 26)

- **Tasks**
  - [ ] Messages module (conversations, messages, read, notification)
  - [ ] Complete unit tests for every service
  - [ ] e2e tests (Supertest): register → login → create post → comment → resolve; report → admin removes post; blocked user refused
  - [ ] Finish the seed (users, admin, posts in every category and district, comments, reports)
- **DAILY CHECK:** send a message between two demo users; run `npm test` and `npm run test:e2e` in `server/` (all green)
- **Commits:** `feat(messages): add private messages`, `test: add unit and e2e tests`, `feat(db): finish seed data`

## Day 7: Backend gate (all)

- **Tasks**
  - [x] Plan update in the backend: login-only access, profile editing (username, password, picture), refresh token, roles + super admin (`SUPER_ADMIN_EMAIL`), admin post/user pages, promote/demote, admin actions as PATCH
  - [ ] Review every endpoint in Swagger (summary, examples, all response codes, admin marked)
  - [ ] Check every error code is returned where expected
  - [ ] Sync docs/02-SPEC.md with the real API
  - [ ] Fix issues; `git tag api-v1.0.0`
- **Needs from owner:** your email and a strong password for the super admin in `server/.env` (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`); then the **big check** of the whole backend (docs/08 Part A)
- **Commits:** `feat(auth): add refresh tokens, change password and login-only access`, `feat(users): edit username and profile picture`, `feat(admin): add roles, super admin and admin detail pages`, `docs: sync API spec`, tag `api-v1.0.0`

## Day 8: Frontend shell, About page + auth modal (features 1, 12, 13)

- **Tasks**
  - [ ] **Design:** read the "Community Board Design v2 — Notice Slips" canvas (or the exported files in `docs/design/`) and the logo `docs/design/logo.png`. If they are missing, ask the owner (🙋 format).
  - [x] `npm run api:types` (openapi-typescript from `/api/docs-json` → `src/lib/api/schema.d.ts`)
  - [x] next-intl + `[locale]` routing + `proxy.ts` (Next 16 name); en/tg/ru.json skeleton; `npm run i18n:check`
  - [x] eslint-plugin-i18next `no-literal-string`
  - [x] Design tokens (light + dark, docs/11) in `globals.css`, fonts Unbounded + Onest (check ғ ӣ қ ӯ ҳ ҷ), logo files and icons made from `docs/design/logo.png`
  - [x] Axios instance with the refresh-on-401 interceptor, QueryProvider, next-themes (Light / Dark / System), MotionConfig
  - [ ] Layout shell: Navbar (floating pill), MobileTopBar, BottomTabBar (floating dark), MobileDrawer, theme + language switchers
  - [x] **About page** (`/[locale]` and `/about`) = the front door; **AuthModal** (Log in / Create account tabs, bottom sheet on phones); route guard: guests on any other link see About with the modal open, then return to that link after login; no `/login` or `/register` pages
  - [x] 404 page (offline page comes with the PWA) (`not-found.tsx`, locale and root), offline page
  - [ ] Dev server reachable on Wi-Fi (`http://<ip>:3000`)
- **Needs from owner:** phone on the same Wi-Fi; `docs/design/logo.png`; the design export if Claude cannot read the canvas
- **READY TO CHECK:** names the artboards to compare with (AboutDesktop/AboutMobile, LoginDesktop/Mobile, RegisterDesktop/Mobile, NotFoundDesktop/Mobile, OfflineDesktop/Mobile, Style)
- **DAILY CHECK:** open About as a guest on laptop and phone; open a post link as a guest (About + modal appear); create account; log in; log out; switch theme (Light/Dark/System) and language; bottom tab bar on phone
- **Commits:** `feat(client): add i18n, design tokens and layout shell`, `feat(auth): add About page and auth modal`

## Day 9: Browse + posts (features 2–11, 14, 15)

- **Tasks:** browse page (filter panel/sheet, search, sort, pagination, counts), PostSlip, post detail (gallery, contacts, comments, resolve), create/edit form with image upload and compression, delete confirmation, server prefetch with HydrationBoundary
- **DAILY CHECK:** create a post with a photo from the phone; filter, search, sort; comment; resolve
- **Commits:** `feat(posts): add browse page`, `feat(posts): add post detail`, `feat(posts): add create and edit forms`

## Day 10: Profiles, saved, report, share, notifications (features 7, 13, 17–21, 23)

- **Tasks:** My profile with **edit username, change password, change picture and Log out button**, public profile, Saved page + heart (optimistic), report dialog, share button, renew, notifications page + bell with polling
- **DAILY CHECK:** save/unsave, report, share (copy, Telegram, phone share sheet), renew an expired post, receive a comment notification
- **Commits:** `feat(profile): add profile pages`, `feat(favorites): add saved page`, `feat(notifications): add notifications`

## Day 11: Admin, messages, map, student verification, PWA, translations (features 16, 22, 24–26)

- **Tasks:** admin panel (TanStack Table + cards) **including the admin post page and admin user page, role filter, Make admin / Remove admin for the super admin and role badges**, messages, map picker and map view, settings page with university email, PWA (manifest, Serwist, offline page, install hint), fill Tajik and Russian translations, motion polish, reduced-motion check
- **Needs from owner:** phone on the same Wi-Fi
- **Big check:** the whole frontend on laptop and phone, all 3 languages (docs/08 Part B)
- **Commits:** `feat(admin): add admin panel`, `feat(messages): add chat`, `feat(map): add map`, `feat(pwa): add manifest and service worker`, `feat(i18n): add Tajik and Russian translations`

## Day 12: Deploy

- **Tasks:** push to GitHub, Neon DB, Render (backend), Vercel (frontend), env vars, `prisma migrate deploy`, seed on Neon, keep-awake workflow, CI. Follow docs/06.
- **Needs from owner:** GitHub, Neon, Render, Vercel accounts (no card)
- **Check:** open the live link
- **Commits:** `ci: add GitHub Actions workflows`, `chore: add deployment config`

## Day 13: Production fixes

- **Tasks:** test live site on laptop and real phone, fix cookies/CORS/env problems, run Lighthouse mobile (targets: Performance 85, Accessibility 90, Best Practices 90, SEO 90)
- **Needs from owner:** phone with the live link
- **Big check:** the live website

## Day 14: Final check

- **Tasks:** final check of all 27 features on both devices in 3 languages, final fixes, README screenshots, tag `v1.0.0`
- **Big check:** everything (docs/08)
