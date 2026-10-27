# 04. Daily Plan (14 days)

Every day ends with a `🔍 DAILY CHECK` for the owner. The next day starts only after the owner reports results. Bugs are fixed first.

**Definition of done (every day):** Swagger works for every new endpoint (all status codes documented) · pages work at 360px and 1280px · no hardcoded text · translation keys present in en/tg/ru · tests pass · `npm run lint` passes · progress log and CLAUDE.md checkboxes updated · committed.

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
  - [ ] Auth module: register, login, logout, me; `JwtAuthGuard`, `OptionalJwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`
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
  - [ ] Review every endpoint in Swagger (summary, examples, all response codes, admin marked)
  - [ ] Check every error code is returned where expected
  - [ ] Sync docs/02-SPEC.md with the real API
  - [ ] Fix issues; `git tag api-v1.0.0`
- **Needs from owner:** the **big check** of the whole backend (docs/08 Part A)
- **Commits:** `docs: sync API spec`, tag `api-v1.0.0`

## Day 8: Frontend shell + auth (features 1, 12)

- **Tasks**
  - [ ] `npm run api:types` (openapi-typescript from `/api/docs-json` → `src/lib/api/schema.d.ts`)
  - [ ] next-intl + `[locale]` routing + `middleware.ts`; en/tg/ru.json skeleton; `npm run i18n:check`
  - [ ] eslint-plugin-i18next `no-literal-string`
  - [ ] Design tokens in `globals.css`, fonts (Inter with Cyrillic), logo SVG, favicon
  - [ ] Axios instance, QueryProvider, next-themes, MotionConfig
  - [ ] Layout shell: Navbar, MobileTopBar, BottomTabBar, MobileDrawer, theme + language switchers
  - [ ] Login and register pages; protected routes
  - [ ] Dev server reachable on Wi-Fi (`http://<ip>:3000`)
- **Needs from owner:** phone on the same Wi-Fi
- **DAILY CHECK:** register/login on laptop and phone; switch theme and language; bottom tab bar on phone
- **Commits:** `feat(client): add i18n, design tokens and layout shell`, `feat(auth): add login and register pages`

## Day 9: Browse + posts (features 2–11, 14, 15)

- **Tasks:** browse page (filter panel/sheet, search, sort, pagination, counts), PostCard, post detail (gallery, contacts, comments, resolve), create/edit form with image upload and compression, delete confirmation, server prefetch with HydrationBoundary
- **DAILY CHECK:** create a post with a photo from the phone; filter, search, sort; comment; resolve
- **Commits:** `feat(posts): add browse page`, `feat(posts): add post detail`, `feat(posts): add create and edit forms`

## Day 10: Profiles, saved, report, share, notifications (features 7, 13, 17–21, 23)

- **Tasks:** My profile, public profile, Saved page + heart (optimistic), report dialog, share button, renew, About page, notifications page + bell with polling
- **DAILY CHECK:** save/unsave, report, share (copy, Telegram, phone share sheet), renew an expired post, receive a comment notification
- **Commits:** `feat(profile): add profile pages`, `feat(favorites): add saved page`, `feat(notifications): add notifications`

## Day 11: Admin, messages, map, student verification, PWA, translations (features 16, 22, 24–26)

- **Tasks:** admin panel (TanStack Table + cards), messages, map picker and map view, settings page with university email, PWA (manifest, Serwist, offline page, install hint), fill Tajik and Russian translations, motion polish, reduced-motion check
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
