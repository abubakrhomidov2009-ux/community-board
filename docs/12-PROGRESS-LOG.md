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

**Finished:**
**Owner check and result:**
**Bugs found and fixed:**
**Open:**
**Next:**

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
