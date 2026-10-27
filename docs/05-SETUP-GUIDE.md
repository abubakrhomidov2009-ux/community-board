# 05. Setup Guide

How the project was set up on day 1 (Windows 11), so it can be repeated on another computer.

## 1. Tools

| Tool               | Version used         | Install (PowerShell)                                                                                                         |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Node.js            | 24.12 (20+ required) | `winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements`                            |
| Git                | 2.52                 | `winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements`                                      |
| PostgreSQL         | 18.6 (16 also works) | `winget install -e --id PostgreSQL.PostgreSQL.16 ...` or the EDB installer                                                   |
| VS Code extensions | –                    | `code --install-extension Prisma.prisma` · `dbaeumer.vscode-eslint` · `esbenp.prettier-vscode` · `bradlc.vscode-tailwindcss` |

Check: `node -v`, `npm -v`, `git --version`, `psql --version`. Set Git name/email: `git config --global user.name "..."` and `git config --global user.email "..."`.

**Free disk space:** keep at least 10 GB free. On day 1 the install failed because the disk was full; `npm cache clean --force` freed 11 GB.

## 2. Create the monorepo (what was done)

```bash
git init
npm init -y
npm pkg set name=community-board
npm install -D concurrently prettier husky lint-staged

npx @nestjs/cli new server --package-manager npm --skip-git
cd server
npm install @nestjs/config@4.0.4 @nestjs/swagger@11.4.7 @nestjs/jwt@11.0.2 @nestjs/throttler@6.7.1 @nestjs/schedule@6.1.3 @prisma/client@6 class-validator class-transformer bcrypt cookie-parser helmet cloudinary multer dotenv
npm install -D prisma@6 @types/bcrypt @types/cookie-parser @types/multer
npx prisma init --datasource-provider postgresql
cd ..

npx create-next-app@latest client --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git
cd client
npm install --legacy-peer-deps @tanstack/react-query @tanstack/react-query-devtools @tanstack/react-table axios zod react-hook-form @hookform/resolvers next-intl next-themes lucide-react leaflet react-leaflet browser-image-compression @serwist/next motion embla-carousel-react vaul
npm install -D --legacy-peer-deps serwist @types/leaflet @tanstack/eslint-plugin-query eslint-plugin-i18next prettier-plugin-tailwindcss jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event openapi-typescript @tailwindcss/postcss
npx shadcn@latest init -d -y
cd ..
```

### Decisions made during setup

- **NestJS 11 + pinned packages:** the newest `@nestjs/swagger`, `config`, `jwt`, `schedule` need NestJS 12; we use the last versions for NestJS 11 (see commands above).
- **Prisma 6:** the newest Prisma pulled in a very large dependency tree and broke the install. Prisma 6 is stable. The generator is `prisma-client-js` (works with NestJS CommonJS). `prisma.config.ts` needs `dotenv`.
- **`--legacy-peer-deps` on the client:** `@hookform/resolvers` has an optional peer dependency (`effect`) that conflicts with npm's resolver. It is not used. To re-install later use `npm install --legacy-peer-deps` in `client/`.
- **Tailwind:** `@tailwindcss/postcss` with `client/postcss.config.mjs` (the scaffold did not include a working Tailwind setup).
- **`turbopack.root`** in `client/next.config.ts` is set to `__dirname`, because the repo has several lockfiles and Next.js otherwise looks for packages in the wrong folder.
- **PostgreSQL 18** instead of 16 (already installed on the owner's computer).
- Root scripts: `dev`, `build`, `lint`, `test`, `format`, `prepare` (Husky). `lint-staged` runs Prettier on staged files.
- After cloning, run `npm run prepare` once so the Husky hook is active.

## 3. Database

### Option A: local PostgreSQL (default)

```sql
CREATE ROLE community_board LOGIN CREATEDB PASSWORD '<generated>';
CREATE DATABASE community_board OWNER community_board;
```

The generated password is saved only in `server/.env` (`DATABASE_URL`).

### Option B: Docker Compose

```bash
docker compose up -d
```

(`docker-compose.yml` starts PostgreSQL 16 on port 5432.) Use the matching `DATABASE_URL`.

### Option C: Neon (fallback)

Create a free project at https://neon.tech, copy the connection string into `DATABASE_URL` (add `?sslmode=require`). Nothing else changes.

### Migrations and seed (from day 2)

```bash
cd server
npx prisma migrate dev          # create/update tables
npx prisma generate
npm run db:seed                 # demo data
```

### Demo logins (created by the seed on day 2/6)

| Role               | Email               | Username | Password     |
| ------------------ | ------------------- | -------- | ------------ |
| Admin              | admin@example.com   | admin    | `Admin12345` |
| User               | aziza@example.com   | aziza    | `Demo12345`  |
| User               | rustam@example.com  | rustam   | `Demo12345`  |
| Student (verified) | madina@example.com  | madina   | `Demo12345`  |
| Blocked user       | blocked@example.com | blocked  | `Demo12345`  |

These are demo-only accounts for the local and demo databases. The seed also adds 15 posts (every category and district, plus one resolved, one expired, one expiring in 2 days and one removed), 6 comments, 5 reports (3 open, 1 resolved, 1 dismissed), 4 favorites, 5 notifications and one conversation between aziza and madina. Running the seed again is safe: it updates the same records. **Do not run the seed with these passwords on a database with real users.**

### Automated tests (backend)

```bash
cd server
npm test            # unit tests (Jest): every service, the guards and the error filter
npm run test:e2e    # end-to-end tests (Jest + Supertest): the real app against a real database
```

The end-to-end tests use their **own database**, `community_board_test`. They create it and apply the migrations by themselves (the PostgreSQL user needs the CREATEDB right, which the setup gives it), and they empty it before each test file, so your demo data is never touched. To use another database (for example in CI) set `E2E_DATABASE_URL`. The tests never send real emails or upload real photos (Brevo and Cloudinary are switched off or replaced). Set `E2E_LOGS=true` to see the app logs while a test fails.

### Production build

`npm run build` in `server/` creates `dist/main.js`; `npm run start:prod` runs it. `server/tsconfig.build.json` excludes `prisma/`, `prisma.config.ts`, `test/` and spec files, so that `dist/main.js` stays at the top of `dist/`.

On Windows the watch mode (`npm run start:dev`) can stop with "The process … not found" after many quick file changes (a Nest CLI quirk). If that happens, start it again.

## 4. Environment variables

### `server/.env` (copy from `server/.env.example`)

| Variable                                                               | Meaning                                                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NODE_ENV`                                                             | `development` or `production`                                                |
| `PORT`                                                                 | `4000` (Render sets its own)                                                 |
| `DATABASE_URL`                                                         | PostgreSQL connection string                                                 |
| `JWT_SECRET`                                                           | long random string (generated for you)                                       |
| `JWT_EXPIRES_IN`                                                       | `7d`                                                                         |
| `CLIENT_URL`                                                           | frontend origin for CORS, `http://localhost:3000`                            |
| `SITE_URL`                                                             | public site URL used in email links (add on day 5)                           |
| `COOKIE_SAMESITE`                                                      | `lax` (default, proxy setup) or `none` (cross-domain fallback)               |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | photo uploads (day 4)                                                        |
| `BREVO_API_KEY`                                                        | emails (day 5)                                                               |
| `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`                                    | sender (your Gmail verified in Brevo)                                        |
| `ALLOWED_UNIVERSITY_DOMAINS`                                           | optional comma list that overrides `server/src/config/university-domains.ts` |

### `client/.env.local` (copy from `client/.env.example`)

| Variable               | Meaning                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `API_PROXY_TARGET`     | where the Next.js `/api` rewrite forwards: `http://localhost:4000` locally, the Render URL in production |
| `NEXT_PUBLIC_SITE_URL` | public site URL (share links, metadata)                                                                  |

Secrets live only in these files, never in Git.

## 5. Run

```bash
npm run dev      # in Community-Board/: starts server (4000) and client (3000)
```

| What    | URL                                                                                        |
| ------- | ------------------------------------------------------------------------------------------ |
| Website | http://localhost:3000                                                                      |
| Health  | http://localhost:4000/api/health (also http://localhost:3000/api/health through the proxy) |
| Swagger | http://localhost:4000/api/docs                                                             |

Other commands: `npm run lint`, `npm test`, `npm run build`, `npm run format`.

## 6. Open the app on a real phone (same Wi-Fi)

1. Connect the phone to the same Wi-Fi as the computer.
2. Find the computer IP: run `ipconfig` and read **IPv4 Address** (on this computer: `192.168.31.166`).
3. On the phone open `http://<that IP>:3000` (e.g. `http://192.168.31.166:3000`).
4. If it does not open: allow Node.js through Windows Firewall (private network), and check both devices use the same network. The IP can change; run `ipconfig` again.
5. `client/next.config.ts` has `allowedDevOrigins` for local network addresses, so the dev server accepts the phone.

Note: the phone shows the full site, but installing as an app (PWA) needs HTTPS, which is available after deployment.

## 7. New packages later

Whenever a later day needs a new package it is installed from the terminal and added to the list above in this file.
