# 10. Portfolio Notes

## Write-up template (blog post or portfolio page)

1. **One-line pitch:** "A trilingual (Tajik/Russian/English) classifieds board for Dushanbe, built mobile-first as an installable web app."
2. **Problem:** local announcements live in scattered chats; hard to search; no language support for Tajik.
3. **Solution:** short description + screenshot.
4. **Features:** the 27 features in 4 phases (copy from README).
5. **Tech stack:** table with reasons for each choice.
6. **Architecture:** the diagram from docs/02.
7. **Challenges and solutions:** see list below.
8. **Results:** Lighthouse scores, test counts, live link, repo link.
9. **What I learned / next steps.**

## README structure (final)

Title and pitch → live demo + Swagger links → screenshots (desktop and mobile) → features → tech stack → architecture → run locally → tests → deployment → future ideas → license.

## Screenshots and demo to capture (day 14)

Desktop (1280px): browse page with filter panel · post detail with gallery · create form · admin dashboard · Swagger page · dark mode.
Mobile (360px / real phone): browse with bottom tab bar · filter bottom sheet · post detail · camera upload · chat · installed app on the home screen · language switcher (tg/ru/en).
Short GIF (10–20 s): open the site on a phone, switch language, create a post with a photo, save it with the heart.

## Main technical challenges to talk about

| Topic                                   | Story                                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API proxy and cookies**               | Cookies on a different domain break on iPhone Safari. Next.js rewrites `/api` to the backend so the cookie is first-party. Fallback with CORS + `SameSite=None` is documented. |
| **i18n from day one**                   | `next-intl` and the `[locale]` route before the first page; ESLint forbids hardcoded text; the backend sends error codes; a script checks translation keys.                    |
| **Swagger-first API**                   | Backend finished and documented first; frontend types generated with `openapi-typescript`, so no guessing.                                                                     |
| **Responsive + PWA**                    | One codebase: bottom sheets and tab bar on mobile, panels and tables on desktop; manifest and service worker; offline page.                                                    |
| **Image uploads**                       | Browser compression, multer memory storage, Cloudinary, cleanup on delete, file-signature checks.                                                                              |
| **Scheduled jobs on a sleeping server** | Cron expiry + check-on-read + keep-awake workflow on free hosting.                                                                                                             |
| **Role-based access**                   | Guards, ownership checks (IDOR), blocked-user refusal on every request.                                                                                                        |
| **Real-time without WebSockets**        | Polling with TanStack Query, paused when the tab is hidden.                                                                                                                    |
| **Server state**                        | Query keys, invalidation, optimistic updates, hydration for SEO.                                                                                                               |
| **Zero-cost stack**                     | Neon + Render + Vercel + Cloudinary + Brevo, all free tiers.                                                                                                                   |

## Interview talking points

- Explain the request path: browser → Next.js → proxy → NestJS → Prisma → PostgreSQL.
- Explain one full feature end to end (e.g. favorites: heart click → optimistic update → PUT endpoint → unique key → invalidation).
- Explain a bug you found and fixed (e.g. the day-1 disk-full install failure; cookies after deploy).
- Explain trade-offs: polling vs WebSockets, uploads through backend vs signed uploads, proxy vs CORS.
- Show tests: unit, e2e, component, i18n check, CI.
- Show accessibility and performance work: Lighthouse numbers, reduced motion, keyboard use.
