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

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 6: Messages + tests

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 7: Backend gate (big check)

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 8: Frontend shell + auth

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 9: Browse + posts

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 10: Profiles, saved, report, share, notifications

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 11: Admin, messages, map, PWA, translations (big check)

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 12: Deploy

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

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
