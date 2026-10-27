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

**Owner check:** pending.
**Open:** rate limiting on login/register comes on day 5.
**Next:** Day 3, Posts + Comments.

## Day 3: Posts + Comments

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

## Day 4: Uploads, Users, Favorites, Reports, Expiry

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

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
