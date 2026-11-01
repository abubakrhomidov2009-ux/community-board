# 12. Progress Log

Updated at the end of every day: what was finished, what the owner checked and the result, bugs found and fixed, anything open, what is next.

## Day 1: Setup

**Finished**

- Tools checked: Node 24.12, npm 11.6, Git 2.52, PostgreSQL 18.6 (kept instead of installing 16). VS Code extensions installed.
- Monorepo, root scripts, Husky + lint-staged + Prettier.
- `server/` (NestJS 11) and `client/` (Next.js 16, Tailwind 4, shadcn) with all packages.
- Local database `community_board` and user; `server/.env` generated.
- `/api/health`, Swagger, `/api` proxy working; lint and server test pass.
- First commit: `chore: set up monorepo with NestJS server and Next.js client`.
- Docs 01–12, README, CLAUDE.md written.

**Problems and fixes**

- C: drive was full (0 GB free): cleared npm cache (11 GB), retried installs.
- Newest `@nestjs/*` packages need NestJS 12: pinned NestJS 11 versions.
- Newest Prisma had a huge dependency tree: pinned Prisma 6.
- Tailwind was not processed: added `@tailwindcss/postcss` and `postcss.config.mjs`.
- Next.js looked for modules in the wrong folder (several lockfiles): set `turbopack.root`.
- Husky hook did not run: `npm run prepare`.

**Owner check:** pending (3 links).
**Open:** none.
**Next:** Day 2, Prisma schema + Auth.

---

## Day 2: Schema + Auth

**Finished**

- Full Prisma schema (11 models, 9 enums) and migration `init`; applied to the local database.
- `PrismaService` (global), env validation, shared error system (`ErrorCode`, `AppException`, `AllExceptionsFilter`, `ErrorResponseDto`), validation pipe that returns the shared error format, `PaginationQueryDto`, `@ApiErrors()` Swagger helper.
- Guards: `JwtAuthGuard` (cookie, fresh user from DB, refuses blocked users), `OptionalJwtAuthGuard`, `RolesGuard` + `@Roles()`, `NotBlockedGuard`; `@CurrentUser()`.
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (feature 1, backend), documented in Swagger with cookie auth.
- Swagger CLI plugin enabled in `nest-cli.json`.
- Seed (`npm run db:seed`): admin, aziza, rustam, madina (student), blocked.
- 10 unit tests for `AuthService`; lint passes.

**Problems and fixes**

- A hidden BOM character (from a PowerShell write) broke `schema.prisma` and could break other files: removed. Rule: never write config files with PowerShell `Set-Content -Encoding utf8`.
- ESLint now allows unused variables that start with `_` (used to drop `passwordHash`).

**Owner check:** passed (register, duplicate email/username, login, blocked user, wrong password, logout).
**Bugs found and fixed:** Swagger showed the same wrong example (404 POST_NOT_FOUND) for every error status: each status now has its own example.
**Open:** rate limiting on login/register comes on day 5.
**Next:** Day 3, Posts + Comments.

## Day 3: Posts + Comments

**Finished**

- Posts (features 2, 3, 4, 6, 8, 9, 10, 11, 14): `GET /posts` (filters, search, sort, pagination), `GET /posts/counts`, `GET /posts/map`, `GET /posts/mine`, `GET /posts/:id`, `POST /posts`, `PATCH /posts/:id`, `DELETE /posts/:id`, `POST /posts/:id/resolve`.
- Rules: contact required, price only for TUTORING/RENTALS, unit required with price, coordinates in pairs, 30-day expiry, owner checks (404 before 403), removed posts hidden from everyone except the author and admins, expired posts hidden from lists.
- Expiry check on read: ACTIVE posts past `expiresAt` are marked EXPIRED (at most once a minute per server).
- `isFavorite` is already computed from the `Favorite` table (the favorite endpoints come on day 4).
- Comments (feature 5): list (oldest first), add (only on ACTIVE posts), delete (author or admin).
- Feature 7 (my profile) backend = `GET /posts/mine`.
- Seed now adds 15 demo posts (every category and district; resolved, expired, expiring soon and removed examples) and 6 comments.
- 61 unit tests pass (auth 10, posts 34, comments 17); lint passes; a live script ran about 60 API checks with 0 failures.

**Problems and fixes**

- The tool that approves shell commands failed for a while: wrote code and tests first, then ran everything once it recovered.

**Owner check:** pending.
**Bugs found and fixed:**
**Open:** the NEW_COMMENT notification is added on day 5; deleting Cloudinary images on post delete is added on day 4.
**Next:** Day 4, Uploads, Users, Favorites, Reports, expiry job + renew.

## Day 4: Uploads, Users, Favorites, Reports, Expiry

**Finished**

- Uploads (feature 15): `POST /posts/:id/images` (multipart, up to 5 per post, jpg/png/webp, max 5 MB; type checked by MIME **and** file signature), `DELETE /posts/:id/images/:imageId`. Files go through the backend to Cloudinary (resized to max 1600px). Photos are deleted from Cloudinary when an image or a post is deleted. A failed upload cleans up the files already sent.
- Favorites (feature 17): `PUT/DELETE /posts/:id/favorite` (safe to repeat), `GET /favorites`; `isFavorite` is real in every post response.
- Public profile (feature 18): `GET /users/:username` (no email, no id), `GET /users/:username/posts`; blocked users have no public profile. `PATCH /users/me` saves the preferred language.
- Expiry and renew (feature 19): `POST /posts/:id/renew` (EXPIRED posts, or ACTIVE posts expiring within 3 days); daily job at 03:00 expires posts and creates the POST_EXPIRING notification 3 days before expiry (once per post); expiry is also checked on read.
- Reports (feature 20): `POST /posts/:id/report`, one per user per post, not on your own post.
- Cloudinary keys set in `server/.env`; a real upload, gallery order, limit and delete were tested against the live account.
- 102 unit tests pass; lint passes; a live script ran about 65 checks with 0 real failures.

**Problems and fixes**

- The one failed check in my live script was a PowerShell time-zone mistake in the script, not in the API.

**Owner check:** pending (the Day 3 check is also still open).
**Bugs found and fixed:**
**Open:** the NEW_COMMENT notification and the notification endpoints come on day 5 (the daily job already writes POST_EXPIRING rows).
**Next:** Day 5, Admin, Notifications, University email (Brevo), Map checks, Rate limiting.

## Day 5: Admin, Notifications, Email, Rate limits

**Finished**

- Notifications (feature 23): `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`. NEW_COMMENT is created when someone comments on your post (not on your own), POST_REMOVED when an admin removes your post, POST_EXPIRING by the daily job; NEW_MESSAGE is ready for day 6.
- Admin API (feature 22), admin only: `GET /admin/stats`, reports (list with filter/sort/pagination, `PATCH` to RESOLVED/DISMISSED), posts (list, remove, restore), users (list, block, unblock). Removing a post closes its open reports and notifies the author; admins cannot be blocked.
- University email (feature 24): `POST /users/me/university-email` and `POST /users/me/university-email/verify`; `MailService` sends through Brevo's HTTP API; email templates in Tajik, Russian and English (user's `preferredLocale`); tokens stored only as SHA-256 hashes, valid 24 hours, single use; allowed domains in `server/src/config/university-domains.ts` or `ALLOWED_UNIVERSITY_DOMAINS` in `server/.env`.
- Map (feature 25): coordinates were validated on day 3 (pair rule, ranges); `GET /posts/map` and clearing a pin are covered by live checks.
- Rate limiting (feature 27): global 100/min per IP, login 5/min, register 5/min, create post 10/hour, comment 20 per 10 min, report 10/hour, university email 3/hour; 429 with `TOO_MANY_REQUESTS`. `THROTTLE_DISABLED=true` switches it off for automated tests only.
- Brevo set up (verified Gmail sender, restricted API key); a real test email in Tajik arrived in the Gmail **Primary** tab, not spam.
- 153 unit tests pass; lint passes; a live script ran 73 checks with 0 failures.

**Problems and fixes**

- The "limits off for tests" setting did not apply to routes with their own limit: replaced by `AppThrottlerGuard` (overrides `shouldSkip`).
- My own test run once logged the "guest" session in as a user, so one check sent a real verification email to a made-up address; the script now uses a fresh anonymous session and cleans up tokens.
- Running a second Nest server for tests shared the `dist/` folder with the main one and stopped it; the test copy is no longer used at the same time.
- Brevo shows DKIM/DMARC warnings for a Gmail sender: expected without an own domain. Mail still arrives; users are told to check spam.

**Owner check:** pending (days 3 and 4 are also still open).
**Bugs found and fixed:**
**Open:** behind Vercel the rate limit would see Vercel's IP for every user: the client IP must come from `X-Forwarded-For` (to do on day 12/13, noted in docs/06). Brevo may land mails in spam for some students.
**Next:** Day 6, Messages + complete tests (unit + e2e) + finish the seed.

## Day 6: Messages + tests

**Finished**

- Private messages (feature 26): `GET /conversations`, `POST /conversations` (reuses the chat with that person), `GET /conversations/:id/messages` (with `after` for polling), `POST /conversations/:id/messages`, `POST /conversations/:id/read`. Unread counts per conversation, only the two people can see a chat, at most one unread NEW_MESSAGE notification per chat, reading clears it.
- Unit tests for every service, the guards, the error filter, the status filter, the mail service and the email templates: **192 tests, 16 files**.
- End-to-end tests (Jest + Supertest, own database `community_board_test`): **56 tests, 7 files**: the main flow (register → login → create post → comment → resolve), report → admin removes post, blocked user refused everywhere, messages, favorites/profile/student badge, real multipart uploads with a fake Cloudinary, all rate limits, and a **Swagger quality gate** that checks all 47 endpoints are documented.
- Seed finished: 5 users, 15 posts, 6 comments, 5 reports, 4 favorites, 5 notifications, 1 conversation with 3 messages. Safe to run twice.
- Live smoke checks against the running server (messages with the demo data, Swagger lists 47 endpoints): 25 checks, 0 failures.

**Problems and fixes**

- **Bug found by the e2e tests:** `GET /posts/mine?status=EXPIRED` (and the admin posts filter) missed a post that had just passed its expiry date but was not swept yet. The status filter now uses the status users see (new `post-status-filter.ts`).
- **Bug found while checking the build:** the build output had moved to `dist/src/main.js` (the seed and Prisma config were included), which would have broken `npm run start:prod` on Render. `tsconfig.build.json` now excludes them; `dist/main.js` is correct.
- The Nest watch mode on Windows stops after many quick file changes ("The process … not found"). The server is now run from the production build (`node dist/main`) during checks.

**Owner check:** the owner asked me to run all the checks myself and report the results, so Claude ran them (unit, e2e and live). The owner's own Swagger check of days 3 to 6 is still open and will be the big check on day 7.
**Bugs found and fixed:** see above.
**Open:** the client IP for rate limits behind Vercel (day 12/13); owner's Swagger big check (day 7).
**Next:** Day 7, the backend gate: full Swagger review, spec sync, tag `api-v1.0.0`, owner's big check.

## Day 7: Backend gate (big check)

**Finished (part 1, 2026-10-28: the plan update, backend side)**

- **Login-only access:** every posts, comments and users endpoint now needs a login (401 for guests). Only `GET /api/health` and the auth endpoints are public. A test checks the whole Swagger document. `OptionalJwtAuthGuard` was removed.
- **Profile editing:** `PATCH /users/me` (username, unique, saved lowercase; language), `POST /auth/change-password` (needs the current password; other devices are logged out), `POST` / `DELETE /users/me/avatar` (Cloudinary, square crop). Logout already existed for the profile page.
- **Refresh token:** login token now lasts 15 minutes; `refresh_token` cookie (30 days, only sent to `/api/auth`) with rotation and stolen-token protection; `POST /auth/refresh`; old tokens cleaned by the daily job.
- **Roles:** `SUPER_ADMIN` added. Exactly one, from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `server/.env` (created or upgraded when the server starts and by the seed). Admin actions are now `PATCH`. New: `GET /admin/posts/:id`, `GET /admin/users/:id`, `PATCH /admin/posts/:id/reports/dismiss`, `PATCH /admin/users/:id/promote|demote`, role filter on the users list, ids on names in admin lists. New error codes: `FORBIDDEN_ROLE`, `CANNOT_CHANGE_SUPER_ADMIN`, `USER_ALREADY_ADMIN`, `USER_NOT_ADMIN`, `REFRESH_TOKEN_INVALID`, `CURRENT_PASSWORD_INCORRECT` (`CANNOT_BLOCK_ADMIN` was replaced).
- Two migrations: `roles_avatar_refresh_tokens`, `refresh_token_rotated_at`.
- Docs updated to the plan: 01-TZ, 02-SPEC, 04-DAILY-PLAN, 05, 06, 08, 11 (design v2 "Notice Slips", Unbounded + Onest, new tokens, round logo, artboard map), CLAUDE.md.
- Tests: **230 unit tests (16 files), 100 e2e tests (10 files)**, lint and type check clean. Live check on the real server: guests 401, login sets both cookies, refresh works, username change, role in body refused, user cannot open admin, logout kills the refresh token. Swagger lists 56 operations.

**Problems and fixes**

- **Security bug found by the new e2e tests (before it shipped):** my 10-second "two tabs" grace window also applied to logged-out tokens, so a refresh token could work for 10 seconds after logout. Fixed by separating `rotatedAt` (replaced, grace allowed) from `revokedAt` (closed for good, never works again), with a regression test.

**Finished (part 2, 2026-10-28: the gate review)**

- Swagger audit script on the live document: **56 operations**, every one has a tag, a summary, a success response with a schema, 401 and 403 where a login is needed, an example on every error response, descriptions on every path parameter, and an example on every request-body and response field. No problems.
- Spec sync: the endpoints in docs/02-SPEC.md §4.3 and the real API are identical (**56 = 56**, none missing either way).
- Error codes: all **44** codes are thrown in the code, documented in Swagger, listed in the spec and covered by an e2e test. Five codes had only unit tests; they now have e2e tests too. A new test keeps the spec's error-code table equal to the `ErrorCode` list.
- Your super admin account (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `server/.env`) works: the server created it on start (username `superadmin`), login answers 200 with role SUPER_ADMIN, and the admin panel opens. The seed still loads.
- Logo saved at `docs/design/logo.png`; the design canvas files (canvas.json and the artboards) saved in `docs/design/canvas/`. No frontend code was touched.
- Final numbers: **230 unit tests (16 files), 105 e2e tests (11 files)**, lint and type check clean.

**Owner check and result:** the owner told Claude to finish day 7, so Claude ran the owner's whole Swagger checklist (Auth, profile, picture with a real Cloudinary upload, login-only, admin, super admin, admin post/user pages) against the live server with a script: **31 of 31 passed**, test data restored. The owner can still try Swagger and report bugs at any time.
**Gate:** all boxes ticked. Tag `api-v1.0.0` set.
**Open:** client IP for rate limits (day 12/13).
**Next:** Day 8 (frontend) only when the owner says to start.

## Day 8 (step 1 of the frontend, 2026-10-29): About page + Log in / Create account

**Finished**

- Foundation: next-intl (en/ru/tg, 139 keys, `npm run i18n:check`), design tokens light + dark (docs/11 §0.3), Light / Dark / System with no flash, Unbounded + Onest fonts, the round logo and every icon made from `docs/design/logo.png` (`npm run icons`), TanStack Query, Axios with silent login renewal, motion presets, the `proxy.ts` guest guard, API types generated from Swagger (`npm run api:types`).
- **About page** (desktop and phone) = the front door: hero with pinned example slips, categories band, How it works, Safe and fair, House rules, call to action, footer (also language and theme switchers).
- **Log in / Create account** modal: a slip on laptop, a bottom sheet on phone; validation with translated messages, server errors (wrong password, email/username taken, blocked, too many tries, no connection), focus trap, Esc, drag to close.
- Guest guard: a guest opening any other link sees About with the modal open and returns to that link after login. Logout returns to About. Temporary `/posts` page proves the login.
- 404 page, skeletons for every page (no spinners), motion on every page (see docs/11 §10), lazy loading of the modal.
- Tests: 26 frontend unit tests (schemas, safe redirect, Axios renewal, translations), lint (with the no-hard-coded-text rule) and type check clean, 39 real-browser checks (Edge, laptop + phone, light + dark, en/ru/tg) all passed.

**Problems and fixes**

- Next.js 16 renamed `middleware.ts` to `proxy.ts`. A lost backslash in the proxy's path pattern made the guard run only on `/`: found by the browser test, fixed.
- After Log out the guard also fired and opened the Log in modal; the redirect after logout never ran because the page was already gone. Fixed (redirect lives in the logout hook).
- **Dev mode broke** with "Can't resolve @vercel/turbopack-next/internal/font/google/font": Google font downloads timed out on this PC. Fonts are now saved in `public/fonts`.
- **Unbounded has no Tajik letters**: Tajik headings use Onest bold.
- An old dev server from day 1 was still running on port 3000 (stale, serving old code); the owner asked to close it and it was restarted.

**Owner check:** pending (see the READY TO CHECK message).
**Open:** Tajik and Russian texts should be read by a native speaker; the real Home board and post pages are the next step; logged-in header links (Saved, Messages, Pin a post, Profile) lead to the 404 page until those pages exist.
**Next:** wait for the owner's go.

---

## Day 8 (step 2 of the frontend, 2026-10-30): Home board, phone tab bar and menu

**Finished**

- Home board at `/posts` (Main, HomeMobile, FiltersMobile, DrawerMobile): search (waits 300 ms), category tabs with counts, district chips, sort, price filter (popover on laptop, bottom sheet on phone), "Show more slips", empty and error states, skeleton, heart (optimistic). Filters live in the page address (`?category=RENTALS&q=room`).
- Phone: floating dark tab bar (Board, Search, +, Saved, Me) and the menu drawer (links, language, theme, Log out). Bell with the unread number on laptop and phone. Light/Dark button in the navbar.
- Replaced next-themes with our own small theme switch (`src/providers/theme.tsx`, first-paint script via next/script): React 19 warned "script tag" with next-themes.
- Backend: `keepAliveTimeout` 65 s (the Next.js proxy got ECONNRESET = HTTP 500 on idle connections); local DATABASE_URL now has `connect_timeout=30&connection_limit=20&pool_timeout=30` (Prisma's default pool of 5 timed out under the board's burst of requests).
- Tests: 33 frontend unit tests, lint, tsc, i18n (192 keys), and 24 real-browser checks (Edge, laptop + phone, light + dark): all passed with 0 console errors.

**Problems and fixes**

- Owner saw the red "script tag" error: fixed (own theme switch).
- Random 500s in the browser test: (1) proxy ECONNRESET, (2) Prisma pool of 5 timed out. Both fixed.
- Clear filters did not empty the search box: the box now follows the address.

**Open:** slip titles link to `/posts/[id]` and Create/Saved/Messages/Notifications/Settings/Profile links give the 404 page until those pages exist (next steps). On Neon (day 12) use its pooled connection string and a small `connection_limit`. ru/tg texts need a native speaker. Saving a heart that fails goes back silently (no toast yet).
**Next:** post detail page, comments, create/edit form (Day 9), when the owner says go.

---

## Day 8: Frontend shell + auth: FINISHED (2026-10-31)

**Finished:** step 1 (About page, Log in / Create account modal, foundation) and step 2 (Home board, phone tab bar and menu, bell, theme button). See the two entries above.
**Owner check and result:** step 1 checked by the owner (reported the "script tag" error and the missing theme button: fixed). Step 2: the owner tested it and said it looks good.
**Bugs found and fixed:** "script tag" console error (own theme switch), no Light/Dark button in the navbar (added), random 500s (proxy keep-alive and database pool, fixed).
**Open:** ru/tg native-speaker review; links to pages that do not exist yet give the 404 page (they come in days 9 to 11).
**Next:** Day 9 (started 2026-10-31).

## Day 9: Browse + posts (2026-10-31)

**Finished**

- Post page `/posts/[id]` (PostDesktop, PostMobile): photo gallery (Embla: swipe, arrows, keyboard, thumbnails), slip card with category strip, price, district, author, Telegram / Call / Save tabs, description, days left, stamps for resolved / expired / removed.
- Comments ("Notes on this slip"): list with "Show more notes", add, delete own note (admins any), author badge, notes closed on inactive posts.
- Owner tools on the post page: Edit, Stamp resolved, Renew 30 days (last 3 days or expired), Take it down with a confirmation dialog.
- Create and edit form `/posts/new`, `/posts/[id]/edit` (CreateDesktop/Mobile, EditDesktop/Mobile): category cards, title, details, price + unit (only tutoring and rentals), district, up to 5 photos (compressed in the browser to about 1600 px / 0.8 MB, camera or gallery on a phone), Telegram and phone, live preview on a laptop, translated validation (same rules as the backend).
- Texts in en, ru and tg (285 keys). Unknown post shows the 404 page.
- Tests: 38 frontend unit tests, lint, tsc, i18n clean; 29 real-browser checks (Edge, laptop + phone): open a post, comment, delete comment, form errors, create with a real photo upload to Cloudinary, see it on the board, edit, stamp resolved, delete (the test post and its photo are removed), 404 page.

- Demo pictures: every demo post now has one picture (themed illustrations in `server/prisma/seed-images`, uploaded to Cloudinary by `npm run db:seed-images` in `server/`; safe to run again).

**Problems and fixes**

- After deleting a post the page asked for it again (a 404 flash): the page stops asking once the post is deleted.
- Lint rules for refs and `Date.now` in render fixed.

**Open:** Share and Report buttons (day 10), map on the post page (day 11), author page `/users/[username]` (day 10), profile, Saved, notifications pages (day 10). On a phone the Back button sits above the photo (the design has it on the photo).
**Next:** Day 10 (profiles, Saved page, report, share, renew, notifications page) when the owner says go.

## Day 10: Profiles, saved, report, share, notifications (2026-10-31)

**Finished**

- **My profile** `/profile` (ProfileDesktop/Mobile): dark header (picture or initials, username, Student stamp, "on the board since", counts), tabs Active / Resolved / Expired / Removed with real totals, my slips, **Edit profile** (change picture with upload and remove, change username, change password with the current password), Public profile link, **Log out**.
- **Public profile** `/users/[username]` (UserDesktop/Mobile): picture, username, Student stamp, active slips, their slips. Unknown user shows the 404 page.
- **Saved** `/saved` (SavedDesktop/Mobile): my saved slips, count, empty state. The heart is now optimistic in every list (board, Saved, profiles) and on the post page.
- **Report** (dialog: reason + note; one report per person per slip, clear message on a second try; no button on my own slip) and **Share** (copy link, Telegram, and the phone share sheet when the browser has one) on the post page.
- **Notifications** `/notifications` (NotificationsDesktop/Mobile): list grouped Today / Earlier, unread dot, tap opens the post or chat and marks read, "Mark all as read", the bell number updates.
- Picture in the navbar and menu now shows the real profile picture.
- Texts in en, ru, tg (360 keys). Renew is on the post page (day 9).

**Problems and fixes**

- A short server hiccup on `/auth/me` was treated as "logged out" and sent people to the Log in modal. Now only a real 401 means logged out; other errors are retried.
- Removing the profile picture crashed the page (the backend answers 204 without a body). Fixed.

**Open:** Settings page (language, theme, university email) is day 11; Messages and the Admin panel are day 11; the "Send a message" button on public profiles comes with Messages. Slip action menu on My profile (the post page has Edit / Resolve / Renew / Delete).
**Next:** Day 11 (admin, messages, map, student badge, installable app, translations check; big check) when the owner says go.

## Day 11: Admin, messages, map, PWA, translations (2026-10-31)

**Finished**

- **Admin panel** (own frame: dark rail on a laptop, top strip on a phone; only admins get in, everybody else sees "You cannot open this page"): Overview (numbers, newest reports), Reports (filter by status, dismiss), Slips (search, filter), **admin slip page** `/admin/posts/[id]` (details, photos, every report, the author; take down with a reason, put back, dismiss reports, block / unblock the author), Users (search, role filter, blocked filter), **admin user page** `/admin/users/[id]` (numbers, their slips, block / unblock; **Make admin / Remove admin only for the super admin**). Admins cannot act on other admins (hidden buttons + backend 403).
- **Admin link:** admins and the super admin land on the Home board like everybody else; the Admin panel link is in the laptop navbar (shield icon), the phone menu and Settings; the admin pages have "Back to the board".
- **Messages** `/messages`, `/messages/[id]`, `/messages/new?to=name` (MessagesDesktop, MessagesMobile, ChatMobile): list + chat on a laptop, list then full-screen chat on a phone, bubbles, day labels, new messages appear by themselves (checked every 5 s), "Send a message" on public profiles, unread numbers.
- **Settings** `/settings`: account, appearance, language, university email (Student ✓ link flow, page `/settings/verify-email`), admin card, log out.
- **Map:** pin picker on the create/edit form (OpenStreetMap + Leaflet, loaded only when needed), map on the post page, List | Map switch on the board.
- **Installable app:** manifest in en / ru / tg, icons, offline page in 3 languages, service worker (offline page + fonts + icons only; pages and API are never cached).
- Texts in en, ru, tg (501 keys). The Light / Dark / System theme no longer uses any script: the server reads a cookie and CSS handles System (this removed the React "script tag" console warning for good).
- Tests: 38 frontend unit tests, lint, tsc, i18n clean; 50 real-browser checks (Edge, laptop + phone) for settings, language switch, messages (with live reply), map, admin as admin and as super admin, manifest, offline page: all passed. Theme checked separately (first paint, language switches, Light / Dark / System, reload): 0 console errors.

**Problems and fixes**

- Admin rail had a link inside a link: fixed. Phone board: the List | Map switch overlapped the Sort box: fixed (row wraps).
- The browser test hit the real rate limits (10 new slips per hour, 5 logins per minute) after many runs; for the final run the API was started with `THROTTLE_DISABLED=true` and then restarted normally. Limits are unchanged.
- Dev only: the Next.js dev proxy sometimes resets a connection (HTTP 500 for one request); pages retry GET requests by themselves. Production (Vercel to Render) does not use this proxy.

**Open:** big check by the owner (docs/08 Part B) on laptop and phone in all 3 languages; ru / tg texts need a native speaker; SUPER ADMIN and demo accounts: see CLAUDE.md. The "install" hint banner is not built (browsers show their own install button).
**Next:** owner big check, then Day 12 (deploy) when the owner says go.

## Day 12: Deploy (2026-11-01)

**Finished**

- Code pushed to GitHub (public): https://github.com/abubakrhomidov2009-ux/community-board (branch `main`, tag `api-v1.0.0`). No secret is in the history (checked).
- **Neon** database (Frankfurt, pooled string): 3 migrations applied with the direct (non-pooled) address. The super admin is created by the server at start (no seed on Neon, so no demo accounts with known passwords).
- **Render** API (Free, Frankfurt): https://community-board-u8eh.onrender.com (build `npm install --include=dev && npx prisma generate && npm run build`, start `npm run start:prod`, health `/api/health`). Settings were pasted from `server/.env.render` (git-ignored, made by a script; `DATABASE_URL` has `pgbouncer=true&connection_limit=5`). Auto-deploy on commit is ON.
- **Vercel** website (Hobby, root `client`): https://community-board-hazel.vercel.app (`API_PROXY_TARGET` = Render address, `NEXT_PUBLIC_SITE_URL` = the Vercel address). `CLIENT_URL` and `SITE_URL` on Render = the Vercel address.
- Rate limits now count the real visitor: first address of `X-Forwarded-For` (`AppThrottlerGuard.getTracker`).
- `.github/workflows/ci.yml` (lint, tests, build for both apps) and `keep-awake.yml` (pings `API_HEALTH_URL` every 14 min).
- Live check from outside (through the Vercel proxy): guest 401, super admin login 200 with HttpOnly + Secure + SameSite cookies, `/auth/me` role SUPER_ADMIN, posts list 200, refresh 200, admin stats 200, logout 204, manifest 200, `sw.js` 200.

**Problems and fixes**

- The verification e-mail link uses `SITE_URL` (not `CLIENT_URL`); locally it pointed to localhost, so a phone could not open it. Now `SITE_URL` is set.
- Render showed another person's GitHub account; the public repository address was used instead.

**Open:** keep-awake needs the GitHub variable `API_HEALTH_URL`; `ALLOWED_UNIVERSITY_DOMAINS` on Render is the placeholder `university.tj` (locally `gmail.com` for tests; set the real school domain before real students use it); the live board is empty (no demo data on purpose); Brevo mail may land in spam.
**Next:** Day 13 (live check on laptop + phone, Lighthouse), after the owner's tests.

## Day 13: Production fixes (big check)

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 14: Final check

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**
