# Community Board

A multilingual (Tajik / Russian / English) web app for local announcements in Dushanbe and at the university. People post and browse announcements in four categories: **Lost & Found, Tutoring, Rentals, Other**. It works on laptop and phone, and can be installed on a phone home screen (PWA).

> Status: see [docs/12-PROGRESS-LOG.md](docs/12-PROGRESS-LOG.md). Everything uses free plans only.

## Screenshots

| Desktop (1280px)           | Mobile (360px)                |
| -------------------------- | ----------------------------- |
| _placeholder: browse page_ | _placeholder: browse page_    |
| _placeholder: post detail_ | _placeholder: post detail_    |
| _placeholder: admin panel_ | _placeholder: bottom tab bar_ |

## Live links

- Website: _placeholder (Vercel link, added on day 12)_
- Swagger (API docs): _placeholder (Render link + `/api/docs`)_

## Features (27)

**Phase 1: MVP**

1. Register / login / logout (unique username)
2. Create, edit, delete own posts
3. Categories: Lost & Found, Tutoring, Rentals, Other
4. Browse with category filter, text search, pagination
5. Comments (add, list, delete own)
6. Post detail page with "mark as resolved"
7. My profile with my own posts

**Phase 2: Easy additions** 8. Price (somoni) for Tutoring and Rentals, with unit (once / per hour / per month) 9. District filter (Sino, Firdavsi, Shohmansur, Ismoili Somoni, University campus, Other) 10. Contact options: Telegram and/or phone (at least one) 11. Sort: newest, oldest, price low to high, price high to low 12. Dark mode (light / dark / system) 13. About page 14. Post count per category in the filter

**Phase 3: Medium additions** 15. Up to 5 images per post (camera or gallery on phones) 16. Three languages: Tajik / Russian / English 17. Favorites (heart) and "Saved" page 18. Public user profile `/users/[username]` 19. Post expiry after 30 days, with "renew" 20. Report a post (spam, scam, offensive, other) 21. Share button (copy link, Telegram, native share sheet)

**Phase 4: Harder additions** 22. Admin role and admin panel (reports, remove posts, block/unblock users, stats) 23. In-app notifications with unread badge 24. University email verification ("Student ✓" badge) 25. Map: location pin on create, map view on browse 26. Private messages (conversation list + chat with polling) 27. Rate limiting; blocked users cannot log in or create content

## Tech stack

| Part                | Tools                                                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend            | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react, next-intl, next-themes, TanStack Query + Table, Axios, Zod + react-hook-form, Motion, Embla, Vaul, Leaflet, Serwist (PWA) |
| Backend             | NestJS 11, TypeScript, Prisma 6, PostgreSQL, JWT in httpOnly cookies, bcrypt, class-validator, Swagger, helmet, throttler, schedule                                                                               |
| Services (all free) | Neon (database), Render (backend), Vercel (frontend), Cloudinary (photos), Brevo (emails), OpenStreetMap (map)                                                                                                    |
| Quality             | Jest, Supertest, React Testing Library, ESLint, Prettier, Husky, GitHub Actions                                                                                                                                   |

## Run locally

Requirements: Node 20+, Git, PostgreSQL. Full guide: [docs/05-SETUP-GUIDE.md](docs/05-SETUP-GUIDE.md).

```bash
npm install                      # root tools
npm install --prefix server
npm install --prefix client --legacy-peer-deps
# copy server/.env.example to server/.env and client/.env.example to client/.env.local, then fill in values
npm run dev                      # starts both apps
```

- Website: http://localhost:3000
- API: http://localhost:4000/api/health
- Swagger: http://localhost:4000/api/docs

## Install the app on a phone

- **Android (Chrome):** open the site, tap the menu (⋮), then "Install app" / "Add to Home screen".
- **iPhone (Safari):** open the site, tap Share, then "Add to Home Screen".

## Documentation

| File                                                         | Content                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| [docs/01-TZ.md](docs/01-TZ.md)                               | Technical assignment, user stories, acceptance criteria |
| [docs/02-SPEC.md](docs/02-SPEC.md)                           | Architecture, database, API, frontend design            |
| [docs/03-ROADMAP.md](docs/03-ROADMAP.md)                     | Stages, milestones, risks                               |
| [docs/04-DAILY-PLAN.md](docs/04-DAILY-PLAN.md)               | 14-day plan                                             |
| [docs/05-SETUP-GUIDE.md](docs/05-SETUP-GUIDE.md)             | Local setup                                             |
| [docs/06-DEPLOYMENT.md](docs/06-DEPLOYMENT.md)               | Deployment                                              |
| [docs/07-CODING-STANDARDS.md](docs/07-CODING-STANDARDS.md)   | Coding rules                                            |
| [docs/08-TESTING-CHECKLIST.md](docs/08-TESTING-CHECKLIST.md) | Test checklists                                         |
| [docs/09-LEARNING-NOTES.md](docs/09-LEARNING-NOTES.md)       | Glossary and Q&A                                        |
| [docs/10-PORTFOLIO.md](docs/10-PORTFOLIO.md)                 | Portfolio and interview notes                           |
| [docs/11-DESIGN-SYSTEM.md](docs/11-DESIGN-SYSTEM.md)         | Design system, wireframes, motion                       |
| [docs/12-PROGRESS-LOG.md](docs/12-PROGRESS-LOG.md)           | Daily progress                                          |

## Future ideas

WebSockets for instant messages, a native mobile app (React Native), push notifications.
