# 09. Learning Notes

Short explanations with simple analogies, for your presentation and interviews.

## Backend

| Term                             | Simple explanation                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **JWT**                          | A signed ticket the server gives you after login. Every request shows the ticket; the server checks the signature. Like a concert wristband.                                                                    |
| **bcrypt**                       | Turns a password into a scrambled string that cannot be reversed. We store only the scramble.                                                                                                                   |
| **httpOnly cookie**              | A cookie that JavaScript on the page cannot read, so a hacker script cannot steal the JWT.                                                                                                                      |
| **SameSite**                     | A cookie rule: should the browser send it on requests from other sites? `Lax` mostly no. It protects against cross-site attacks.                                                                                |
| **DTO**                          | "Data Transfer Object": a class that describes exactly what data may come in or go out of an endpoint. Like a form with fixed fields.                                                                           |
| **Validation (class-validator)** | Rules on DTO fields (length, format). Bad data is stopped at the door.                                                                                                                                          |
| **Guard**                        | A bouncer before an endpoint: `JwtAuthGuard` checks you are logged in, `RolesGuard` checks you are an admin.                                                                                                    |
| **Dependency injection**         | Nest creates the objects a class needs and hands them over, instead of the class creating them. Like a kitchen where the cook asks for ingredients and they arrive. Makes testing easy (give fake ingredients). |
| **ORM / Prisma**                 | Lets us talk to the database with TypeScript instead of raw SQL. The `schema.prisma` file describes tables.                                                                                                     |
| **Migration**                    | A saved step that changes the database structure (add a table or column). Like version history for the database.                                                                                                |
| **Seed**                         | A script that fills the database with demo data.                                                                                                                                                                |
| **Index**                        | Like the index of a book: finds rows fast without reading everything.                                                                                                                                           |
| **Cascade delete**               | Delete a post and its comments disappear automatically.                                                                                                                                                         |
| **Swagger / OpenAPI**            | A live, clickable manual of the API where you can test every endpoint. The `/api/docs-json` file is machine-readable, so the frontend generates its types from it.                                              |
| **CORS**                         | A browser rule: a page from site A may call site B only if B allows it. We allow only our frontend.                                                                                                             |
| **Proxy (rewrite)**              | The frontend server forwards `/api/...` to the backend. The browser thinks there is only one site, so cookies are first-party and safe on iPhone Safari.                                                        |
| **Rate limiting**                | Max number of requests per minute, to stop spam and password guessing. Returns 429.                                                                                                                             |
| **IDOR**                         | "Insecure direct object reference": changing `/posts/5` to `/posts/6` and editing someone else's post. We stop it by checking the author on every change.                                                       |
| **Cron job**                     | A task that runs on a schedule (every night, expire old posts).                                                                                                                                                 |
| **Signed uploads**               | The server gives the browser a temporary permission slip to upload directly to Cloudinary. We chose uploads through our backend instead (simpler, all checks in one place).                                     |
| **Error codes**                  | The backend sends `POST_NOT_FOUND`, not a sentence, so the frontend can show it in Tajik, Russian or English.                                                                                                   |
| **Environment variables**        | Settings and secrets kept outside the code (`.env`).                                                                                                                                                            |
| **Unit test / e2e test**         | Unit: tests one class with fakes. e2e: starts the app and calls real endpoints.                                                                                                                                 |

## Frontend

| Term                              | Simple explanation                                                                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js App Router**            | Folders in `app/` become pages. Layouts wrap pages.                                                                                                                                                         |
| **SSR / CSR / Server Components** | SSR: the server builds the HTML (good for SEO and speed). CSR: the browser builds it. Server Components run only on the server and send ready HTML; Client Components run in the browser for interactivity. |
| **Middleware**                    | Code that runs before a page loads, for example to pick the language or redirect guests to login.                                                                                                           |
| **i18n (next-intl)**              | Internationalisation: all text comes from translation files, language is in the URL (`/tg`, `/ru`, `/en`).                                                                                                  |
| **TanStack Query**                | Manages server data in the browser: fetching, caching, refreshing.                                                                                                                                          |
| **Query key**                     | The name of a cached result, e.g. `['posts','list',{category:'RENTALS'}]`.                                                                                                                                  |
| **Cache / staleTime**             | How long cached data counts as fresh before refetching.                                                                                                                                                     |
| **Invalidation**                  | Telling the cache "this data is old, reload it" after a change, e.g. after adding a comment.                                                                                                                |
| **Mutation**                      | A request that changes data (POST, PATCH, DELETE).                                                                                                                                                          |
| **Optimistic update**             | Update the screen immediately (heart turns red), then confirm with the server; undo if it fails.                                                                                                            |
| **Hydration (HydrationBoundary)** | The server pre-loads data and hands it to the browser's cache so the page does not load twice.                                                                                                              |
| **Polling**                       | Asking the server again every few seconds (notifications every 30 s, chat every 5 s). Simple; WebSockets would be instant but more complex.                                                                 |
| **TanStack Table**                | A headless table engine: handles sorting, pages and columns; we draw the markup. Server-side pagination means the server sends one page at a time.                                                          |
| **Zod + react-hook-form**         | Zod describes form rules; react-hook-form handles typing, errors and submit.                                                                                                                                |
| **Responsive / mobile-first**     | Design the phone layout first, then add rules for bigger screens.                                                                                                                                           |
| **PWA**                           | A website that can be installed on the home screen and works partly offline.                                                                                                                                |
| **Service worker**                | A background script that caches files so the app opens offline and loads fast.                                                                                                                              |
| **Dark mode (next-themes)**       | Adds a `dark` class to the page; Tailwind `dark:` classes change colours.                                                                                                                                   |
| **Motion / reduced motion**       | Small animations help users understand changes. If the user asks their device for less motion, we turn them off.                                                                                            |
| **Lighthouse**                    | Chrome's audit that scores performance, accessibility, best practices and SEO.                                                                                                                              |

## Questions people may ask

**Why a proxy instead of calling the backend directly?** So the login cookie belongs to one site. Cross-site cookies are blocked on iPhone Safari and cause bugs on deploy day.

**Why store the JWT in a cookie, not localStorage?** localStorage can be read by any script (XSS). An httpOnly cookie cannot.

**How do you stop users editing other people's posts?** Every edit/delete endpoint compares the post's `authorId` with the logged-in user in the service layer, and e2e tests cover it.

**How is the site multilingual?** `next-intl`, the locale in the URL, three JSON files, an ESLint rule that forbids hardcoded text, and a script that checks all files have the same keys. The backend never sends text, only error codes.

**Why backend first?** The Swagger API is the contract. The frontend types are generated from it, so they cannot drift apart.

**What happens when the free server sleeps?** The first request is slow. A scheduled GitHub Action pings the health endpoint every 14 minutes, and the expiry logic also runs when posts are read, so results are right even if the cron job slept.

**How are images handled?** Compressed in the browser, sent to the backend, validated (type, size, count), uploaded to Cloudinary; the URL and ID are saved. Deleting a post deletes the files.

**How do you secure the app?** bcrypt, httpOnly cookies, helmet, CORS, validation with whitelist, rate limiting, ownership and role guards, upload checks, secrets in env files.

**Why polling and not WebSockets?** Simpler, works on free hosting, enough for v1. WebSockets are a future upgrade.

**What would you improve next?** Push notifications, WebSockets, a native app, translating posts, custom domain.
