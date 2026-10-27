# 08. Testing Checklist

Written for the owner (no coding needed). Tick the boxes. Report problems like this:
**Bug: <page> / I did: <...> / I expected: <...> / I got: <...>** (a screenshot helps).

Demo logins are in docs/05-SETUP-GUIDE.md (admin, aziza, rustam, madina, blocked).

---

# Part A: Backend in Swagger (days 2–7)

Open http://localhost:4000/api/docs. **To log in:** open `POST /api/auth/login` → **Try it out** → type `{"emailOrUsername":"aziza","password":"Demo12345"}` → **Execute**. You should get 200. The browser keeps the cookie, so protected endpoints now work with "Try it out". For admin endpoints log in as `admin`.

### Auth

| ☐   | Endpoint            | Type                                              | Expect                     |
| --- | ------------------- | ------------------------------------------------- | -------------------------- |
| ☐   | POST /auth/register | new email, username `test1`, password `Test12345` | 201, user without password |
| ☐   | POST /auth/register | same email again                                  | 409 `EMAIL_TAKEN`          |
| ☐   | POST /auth/register | same username                                     | 409 `USERNAME_TAKEN`       |
| ☐   | POST /auth/register | password `123`                                    | 400 `VALIDATION_FAILED`    |
| ☐   | POST /auth/login    | wrong password                                    | 401 `INVALID_CREDENTIALS`  |
| ☐   | POST /auth/login    | `blocked` user                                    | 403 `USER_BLOCKED`         |
| ☐   | GET /auth/me        | logged in / logged out                            | 200 / 401 `UNAUTHORIZED`   |
| ☐   | POST /auth/logout   | –                                                 | 204; then /auth/me is 401  |

### Posts

| ☐   | Endpoint                 | Type                                                  | Expect                                             |
| --- | ------------------------ | ----------------------------------------------------- | -------------------------------------------------- |
| ☐   | POST /posts              | TUTORING, price 100, PER_HOUR, telegram `aziza_tutor` | 201, `expiresAt` ≈ +30 days                        |
| ☐   | POST /posts              | no telegram and no phone                              | 400 `CONTACT_REQUIRED`                             |
| ☐   | POST /posts              | LOST_FOUND with price                                 | 400 `PRICE_NOT_ALLOWED`                            |
| ☐   | POST /posts              | price without unit                                    | 400 `PRICE_UNIT_REQUIRED`                          |
| ☐   | POST /posts              | logged out                                            | 401                                                |
| ☐   | GET /posts               | `category=TUTORING`                                   | only tutoring                                      |
| ☐   | GET /posts               | `district=SINO`, `q=math`                             | filtered                                           |
| ☐   | GET /posts               | `sort=price_asc` / `price_desc` / `oldest` / `newest` | correct order                                      |
| ☐   | GET /posts               | `page=2&limit=5`                                      | 5 items, `total`, `totalPages`                     |
| ☐   | GET /posts/counts        | –                                                     | numbers per category                               |
| ☐   | GET /posts/{id}          | unknown id                                            | 404 `POST_NOT_FOUND`                               |
| ☐   | PATCH /posts/{id}        | as the author                                         | 200                                                |
| ☐   | PATCH /posts/{id}        | as another user                                       | 403 `POST_NOT_OWNER`                               |
| ☐   | POST /posts/{id}/resolve | author                                                | 200 status RESOLVED; again → 409 `POST_NOT_ACTIVE` |
| ☐   | POST /posts/{id}/renew   | on a fresh ACTIVE post                                | 409 `RENEW_NOT_ALLOWED`                            |
| ☐   | DELETE /posts/{id}       | author / other user                                   | 204 / 403                                          |
| ☐   | GET /posts/map           | –                                                     | pins with coordinates only                         |
| ☐   | GET /posts/mine          | logged in                                             | my posts, all statuses                             |

### Comments, favorites, reports

| ☐   | Endpoint                    | Type                     | Expect                        |
| --- | --------------------------- | ------------------------ | ----------------------------- |
| ☐   | POST /posts/{id}/comments   | `{"body":"Is it free?"}` | 201                           |
| ☐   | GET /posts/{id}/comments    | –                        | oldest first                  |
| ☐   | DELETE /comments/{id}       | own / other's            | 204 / 403 `COMMENT_NOT_OWNER` |
| ☐   | PUT /posts/{id}/favorite    | –                        | 204 (twice is fine)           |
| ☐   | GET /favorites              | –                        | contains the post             |
| ☐   | DELETE /posts/{id}/favorite | –                        | 204                           |
| ☐   | POST /posts/{id}/report     | `{"reason":"SPAM"}`      | 201                           |
| ☐   | POST /posts/{id}/report     | again                    | 409 `REPORT_ALREADY_EXISTS`   |
| ☐   | POST /posts/{id}/report     | own post                 | 400 `REPORT_OWN_POST`         |

### Uploads

| ☐   | Endpoint                            | Type              | Expect                      |
| --- | ----------------------------------- | ----------------- | --------------------------- |
| ☐   | POST /posts/{id}/images             | choose 1 jpg      | 201, `url` opens in browser |
| ☐   | POST /posts/{id}/images             | 6 images in total | 400 `IMAGE_LIMIT_EXCEEDED`  |
| ☐   | POST /posts/{id}/images             | a .gif or .pdf    | 400 `IMAGE_TYPE_INVALID`    |
| ☐   | POST /posts/{id}/images             | file over 5 MB    | 413 `IMAGE_TOO_LARGE`       |
| ☐   | DELETE /posts/{id}/images/{imageId} | –                 | 204                         |

### Users, notifications, messages

| ☐   | Endpoint                                        | Type                                         | Expect                                |
| --- | ----------------------------------------------- | -------------------------------------------- | ------------------------------------- |
| ☐   | GET /users/aziza                                | –                                            | public data, no email                 |
| ☐   | GET /users/nobody                               | –                                            | 404 `USER_NOT_FOUND`                  |
| ☐   | GET /users/aziza/posts                          | –                                            | ACTIVE posts only                     |
| ☐   | PATCH /users/me                                 | `{"preferredLocale":"TG"}`                   | 200                                   |
| ☐   | POST /users/me/university-email                 | your own university-style email              | 204 and an email arrives (check spam) |
| ☐   | POST /users/me/university-email                 | `a@gmail.com`                                | 400 `UNIVERSITY_DOMAIN_NOT_ALLOWED`   |
| ☐   | POST /users/me/university-email/verify          | token from the email                         | 200 `isStudentVerified: true`         |
| ☐   | GET /notifications, /notifications/unread-count | after another user comments                  | new item, count 1                     |
| ☐   | POST /notifications/{id}/read, /read-all        | –                                            | 204, count drops                      |
| ☐   | POST /conversations                             | `{"recipientUsername":"rustam","body":"Hi"}` | 201                                   |
| ☐   | POST /conversations                             | to yourself                                  | 400 `MESSAGE_SELF`                    |
| ☐   | GET/POST /conversations/{id}/messages           | –                                            | 200/201                               |

### Admin (log in as `admin`)

| ☐   | Endpoint                                       | Type                     | Expect                                                                                        |
| --- | ---------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| ☐   | GET /admin/stats                               | –                        | numbers                                                                                       |
| ☐   | GET /admin/reports, /admin/posts, /admin/users | –                        | paginated lists                                                                               |
| ☐   | PATCH /admin/reports/{id}                      | `{"status":"DISMISSED"}` | 200                                                                                           |
| ☐   | POST /admin/posts/{id}/remove                  | –                        | 200 REMOVED; the author gets a POST_REMOVED notification; the post disappears from GET /posts |
| ☐   | POST /admin/posts/{id}/restore                 | –                        | 200 ACTIVE                                                                                    |
| ☐   | POST /admin/users/{id}/block                   | a normal user            | 200; that user cannot log in                                                                  |
| ☐   | POST /admin/users/{id}/unblock                 | –                        | 200                                                                                           |
| ☐   | any /admin/* as a normal user                  | –                        | 403 `ADMIN_ONLY`                                                                              |
| ☐   | any /admin/* logged out                        | –                        | 401                                                                                           |

### Rate limits

| ☐   | Test                                                           | Expect                  |
| --- | -------------------------------------------------------------- | ----------------------- |
| ☐   | Execute POST /auth/login with a wrong password 6 times quickly | 429 `TOO_MANY_REQUESTS` |

## "Backend done" gate (all must be ticked)

- [ ] Every endpoint in docs/02-SPEC.md exists, works and is documented in Swagger with examples and every response code
- [ ] Every error code in docs/02-SPEC.md is returned where expected
- [ ] All unit and e2e tests pass (`npm test`, `npm run test:e2e` in `server/`)
- [ ] `npm run db:seed` loads demo data
- [ ] docs/02-SPEC.md matches the real API
- [ ] Day 7 big check done in Swagger, all bugs fixed
- [ ] `git tag api-v1.0.0`

---

# Part B: Frontend (days 8–11, 13, 14)

Columns: **M** = mobile (360px or real phone), **D** = desktop (1280px). Tick both. Also test in **EN / RU / TG** and **light / dark**.

| #   | Feature          | Steps                                                    | Expected                                                                                       | M   | D   |
| --- | ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --- | --- |
| 1   | Auth             | Register; log out; log in; wrong password                | Logged in with username in the menu; clear translated error                                    | ☐   | ☐   |
| 2   | Post CRUD        | Create, edit, delete (confirm)                           | Appears in list; edit saved; delete asks for confirmation                                      | ☐   | ☐   |
| 3   | Categories       | Create one in each category                              | Coloured badge, translated name                                                                | ☐   | ☐   |
| 4   | Browse           | Filter, search, paginate                                 | Correct results; URL keeps filters; skeletons while loading                                    | ☐   | ☐   |
| 5   | Comments         | Add, delete own                                          | New comment slides in; delete closes the gap                                                   | ☐   | ☐   |
| 6   | Detail + resolve | Open a post, press Mark as resolved                      | Badge changes with a short animation                                                           | ☐   | ☐   |
| 7   | My profile       | Open Profile                                             | My posts with status                                                                           | ☐   | ☐   |
| 8   | Price            | Tutoring 300 per month                                   | "300 сомонӣ / моҳ" style, per language                                                         | ☐   | ☐   |
| 9   | District         | Filter by district                                       | Only that district                                                                             | ☐   | ☐   |
| 10  | Contact          | Tap Telegram and Call                                    | Telegram opens `t.me/...`; phone opens the dialer                                              | ☐   | ☐   |
| 11  | Sort             | All four options                                         | Correct order                                                                                  | ☐   | ☐   |
| 12  | Dark mode        | Light / dark / system, reload                            | Saved; no white flash                                                                          | ☐   | ☐   |
| 13  | About            | Open About                                               | Translated text                                                                                | ☐   | ☐   |
| 14  | Counts           | Look at category filter                                  | "Tutoring (24)" style; changes with other filters                                              | ☐   | ☐   |
| 15  | Images           | Add 5 images (camera/gallery on phone); add a 6th        | Compressed, uploaded, swipeable gallery; sixth refused with message                            | ☐   | ☐   |
| 16  | Languages        | Switch EN/RU/TG on every page                            | No English left over, no missing text                                                          | ☐   | ☐   |
| 17  | Favorites        | Tap the heart; open Saved                                | Heart pops instantly; post listed on Saved                                                     | ☐   | ☐   |
| 18  | Public profile   | Click an author name                                     | Join date and active posts, no email                                                           | ☐   | ☐   |
| 19  | Expiry/renew     | Use an expired demo post; press Renew                    | Becomes active again                                                                           | ☐   | ☐   |
| 20  | Report           | Report a post; report again                              | Success toast; second time shows "already reported"                                            | ☐   | ☐   |
| 21  | Share            | Copy link; Telegram; phone share sheet                   | Works                                                                                          | ☐   | ☐   |
| 22  | Admin            | Log in as admin; reports, remove post, block user, stats | Tables on desktop, cards on mobile; non-admin sees no admin link and gets a "not allowed" page | ☐   | ☐   |
| 23  | Notifications    | Another user comments; open bell                         | Badge shakes and counts up; mark as read                                                       | ☐   | ☐   |
| 24  | Student badge    | Add university email; click link                         | "Student ✓" badge                                                                              | ☐   | ☐   |
| 25  | Map              | Pin a location; open map view                            | Pin saved; pins on the browse map; "© OpenStreetMap contributors" visible                      | ☐   | ☐   |
| 26  | Messages         | Send a message between two accounts                      | Appears within ~5 s; unread badge                                                              | ☐   | ☐   |
| 27  | Limits/blocked   | Blocked user logs in; spam the login                     | Blocked message; "too many attempts" message                                                   | ☐   | ☐   |

### Permission tests

| ☐   | Who     | Test                         | Expect                      |
| --- | ------- | ---------------------------- | --------------------------- |
| ☐   | Guest   | Open `/en/posts/new`         | Redirect to login           |
| ☐   | Guest   | Open `/en/admin`             | Redirect to login           |
| ☐   | User    | Open `/en/admin`             | Not allowed page            |
| ☐   | User    | Edit someone else's post URL | Not allowed                 |
| ☐   | Blocked | Try to log in                | Clear blocked message       |
| ☐   | Admin   | Remove a post                | Disappears from public list |

### Design, motion, accessibility

- [ ] Every item in the design review checklist (docs/11) ticked
- [ ] Reduced motion: turn on "Reduce motion" in the system settings; animations become simple fades or stop
- [ ] Tab key moves through the page with a visible focus ring (desktop)
- [ ] Nothing wider than the screen at 360px (no sideways scroll)
- [ ] Tap targets are comfortable on the phone

### PWA tests (after deployment, HTTPS)

- [ ] Install to home screen (Android and iPhone), icon looks right
- [ ] Opens without browser bar
- [ ] Airplane mode: translated offline page
- [ ] After a new deploy, the app updates (toast or refresh)

### Lighthouse (live site, mobile): Performance ≥ 85 · Accessibility ≥ 90 · Best Practices ≥ 90 · SEO ≥ 90

---

# Part C: Automated tests Claude writes

| Level              | Tool                         | Examples                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend unit       | Jest                         | `AuthService › register › throws EMAIL_TAKEN`, `PostsService › create › throws CONTACT_REQUIRED`, `PostsService › update › throws POST_NOT_OWNER`, `PostsService › list › excludes expired and removed`, `ReportsService › create › throws REPORT_ALREADY_EXISTS`, `TasksService › expirePosts › marks old posts EXPIRED`, `UploadsService › rejects 6th image`, `MessagesService › refuses messaging yourself` |
| Backend e2e        | Jest + Supertest             | `register → login → create post → comment → resolve`; `report → admin removes post → post hidden`; `blocked user cannot log in or create`; `guest gets 401 on POST /posts`; `login is rate limited`                                                                                                                                                                                                             |
| Frontend component | Jest + React Testing Library | `PostCard renders title, price and category badge`, `FilterPanel calls onChange when category clicked`, `LoginForm shows translated validation errors`, `FavoriteButton toggles optimistically`, `EmptyState shows its action`                                                                                                                                                                                  |
| i18n               | script                       | `npm run i18n:check` fails if a key is missing in en/tg/ru                                                                                                                                                                                                                                                                                                                                                      |
