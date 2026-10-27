# 11. Design System

Follow this file on every page. Goal: a calm, scannable, real-looking classifieds product, not a generic template.

## 1. Principles

- Content first: the post list is the product. Chrome is quiet.
- Mobile-first (360px), then tablet, then desktop (max content width 1280px).
- One brand color, one accent, subtle borders instead of heavy shadows.
- Every screen has designed loading, empty, error and success states.
- Real copy in all 3 languages; no lorem ipsum, no fake statistics.

**Avoid:** purple/blue gradients, glowing blobs, glassmorphism, emoji as icons, decorative icons on every line, giant slogan heroes, every element as a shadowed rounded card, random font sizes, centered text everywhere.

## 2. Brand

- **Logo "Mountain pin":** a location pin (primary green `#0F766E`) with white mountains and a small amber sun (`#F59E0B`) inside. Source: `client/public/logo.svg`. Favicon and PWA icons (192, 512, maskable 512 with safe padding) are exported from it.
- Wordmark "Community Board" in the text font, semi-bold.

## 3. Color tokens (defined once in `client/src/app/globals.css` with Tailwind v4 `@theme`)

| Token                        | Light     | Dark      | Use                                     |
| ---------------------------- | --------- | --------- | --------------------------------------- |
| `--color-background`         | `#FAFAF9` | `#0C1211` | page                                    |
| `--color-surface`            | `#FFFFFF` | `#141C1B` | cards, inputs, sheets                   |
| `--color-surface-muted`      | `#F3F4F2` | `#1B2524` | skeletons, subtle fills                 |
| `--color-border`             | `#E3E5E1` | `#2A3634` | borders, dividers                       |
| `--color-foreground`         | `#1C1917` | `#ECF1F0` | text                                    |
| `--color-muted-foreground`   | `#57534E` | `#A3B2AF` | secondary text                          |
| `--color-primary`            | `#0F766E` | `#2DD4BF` | main actions, links                     |
| `--color-primary-hover`      | `#0D5F59` | `#5EEAD4` | hover                                   |
| `--color-primary-foreground` | `#FFFFFF` | `#042F2C` | text on primary                         |
| `--color-accent`             | `#F59E0B` | `#FBBF24` | small highlights only (sun, unread dot) |
| `--color-success`            | `#15803D` | `#4ADE80` | success                                 |
| `--color-warning`            | `#B45309` | `#FBBF24` | warning, expiring                       |
| `--color-danger`             | `#B91C1C` | `#F87171` | errors, destructive                     |
| `--color-info`               | `#1D4ED8` | `#60A5FA` | info                                    |
| `--color-ring`               | `#0F766E` | `#2DD4BF` | focus ring (2px + 2px offset)           |

Category badges (small, background + text; used sparingly):

| Category   | Light bg / text       | Dark bg / text        |
| ---------- | --------------------- | --------------------- |
| LOST_FOUND | `#FEF3C7` / `#92400E` | `#3B2A0B` / `#FCD34D` |
| TUTORING   | `#DBEAFE` / `#1E40AF` | `#12233F` / `#93C5FD` |
| RENTALS    | `#DCFCE7` / `#166534` | `#10301C` / `#86EFAC` |
| OTHER      | `#E7E5E4` / `#44403C` | `#292524` / `#D6D3D1` |

All text/background pairs must reach contrast 4.5:1 (3:1 for large text and icons). Dark mode is a designed palette (above), never inverted colors.

## 4. Typography

- Font: **Inter** via `next/font/google` with subsets `latin`, `latin-ext`, `cyrillic`, `cyrillic-ext` (supports Tajik ғ ӣ қ ӯ ҳ ҷ). Check these letters visually on the big checks.
- Scale (px / line height / weight): `12/16/500` caption · `14/20/400` small · `16/24/400` body · `20/28/600` h3 · `24/32/600` h2 · `32/40/700` h1 (desktop; mobile h1 = 24).
- Inputs always 16px on mobile (prevents iPhone zoom). Left-aligned text by default. Max line length ~70 characters for descriptions.

## 5. Spacing, radius, shadows, layout

- Spacing: 4px base. Use 4, 8, 12, 16, 24, 32, 48. Page gutter 16px (mobile), 24px (tablet), 32px (desktop). Section gap 24–32px.
- Radius: **8px** for inputs, buttons, badges-as-pills use full; **12px** for cards, sheets, dialogs. Nothing else.
- Borders: 1px `--color-border`. Shadows only for floating layers (dropdown, dialog, sheet): one soft shadow `0 8px 24px rgb(0 0 0 / 0.12)`.
- Icons: **lucide-react only**, 20px default (16 in dense UI, 24 in tab bar), stroke 1.75.

## 6. Breakpoints

| Name    | Width    | Tailwind | Layout                                                  |
| ------- | -------- | -------- | ------------------------------------------------------- |
| Mobile  | 360–767  | base     | 1 column, top bar + bottom tab bar                      |
| Tablet  | 768–1023 | `md:`    | 2 columns of cards, top bar, no bottom bar optional     |
| Desktop | 1024+    | `lg:`    | navbar, left filter panel, 2–4 column grid (max 1280px) |

## 7. Components

| Component                     | Variants / notes                                                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**                    | `primary`, `secondary` (border), `ghost`, `destructive`; sizes `sm` (36), `md` (44), `lg` (48); `loading` state; icon-only has `aria-label`; press: scale 0.97                                     |
| **Input / Textarea**          | label above, helper text, error text (slides in), 44px height, 16px font, left icon optional                                                                                                       |
| **Select**                    | shadcn Select on desktop; native-feeling sheet on mobile                                                                                                                                           |
| **Badge**                     | `category` (4 colors), `status` (ACTIVE success, RESOLVED info, EXPIRED muted, REMOVED danger), `student` (Student ✓ with primary tint), count                                                     |
| **Card**                      | surface + 1px border + 12px radius, no shadow; hover on desktop: border darkens                                                                                                                    |
| **PostCard**                  | thumbnail (4:3, first image or category placeholder), category badge, title (2 lines), price line, district + time ago, heart button; list variant (horizontal) on mobile, grid variant on desktop |
| **Avatar**                    | initials on a muted circle (no photos in v1); sizes 24/32/40                                                                                                                                       |
| **EmptyState**                | simple line illustration (own SVG), title, one sentence, primary action                                                                                                                            |
| **Skeleton**                  | muted block with shimmer; same shape as the real content                                                                                                                                           |
| **Pagination**                | previous / next + page numbers on desktop; "Page 2 of 7" with prev/next on mobile                                                                                                                  |
| **Modal (Dialog)**            | centered on desktop, becomes a bottom sheet on mobile                                                                                                                                              |
| **Sheet / Drawer**            | Vaul bottom sheet with drag handle; side drawer for the menu                                                                                                                                       |
| **Toast**                     | bottom on mobile, bottom-right on desktop; success/error/info; auto-hide 4 s; swipe to dismiss                                                                                                     |
| **BottomTabBar**              | 5 items: Home, Search, Create (+, raised primary circle), Saved, Profile; 56px + safe-area padding; active icon indicator slides between tabs                                                      |
| **Navbar**                    | logo, search field, "Create post" primary button, language switcher, theme switch, bell with badge, avatar menu                                                                                    |
| **FilterPanel / FilterSheet** | category radio list with counts, district select, price range, sort                                                                                                                                |
| **ImageGallery**              | main image + thumbnails (desktop), swipe carousel with dots (mobile)                                                                                                                               |
| **Table (admin)**             | dense rows, sticky header, sort arrows, pagination; stacked cards on mobile                                                                                                                        |

## 8. Page wireframes

### Browse (`/`)

Mobile:

```
┌────────────────────────┐
│ [logo]      🔍  🔔  ☰  │  (top bar; icons are lucide)
├────────────────────────┤
│ [Search posts...      ] │
│ [Filters] [Sort ▾]      │
│ (All) Lost  Tutor  Rent │  chips, horizontal scroll
├────────────────────────┤
│ ┌───┐ Title two lines   │
│ │img│ 300 сом / month   │
│ └───┘ Sino · 2 h ago  ♡ │
│ ┌───┐ ...               │
├────────────────────────┤
│  ‹ Page 2 of 7 ›        │
├────────────────────────┤
│ Home Search (+) Saved Me│  bottom tab bar
└────────────────────────┘
```

Desktop:

```
┌──────────────────────────────────────────────────────────┐
│ logo  [ Search...............]  [+ Create] EN ◐ 🔔 (A)   │
├───────────────┬──────────────────────────────────────────┤
│ Category      │  24 posts      Sort [Newest ▾]  [List|Map]│
│ ○ All (120)   │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ ○ Lost (18)   │ │ img  │ │ img  │ │ img  │ │ img  │       │
│ ○ Tutor (24)  │ │ title│ │ title│ │ title│ │ title│       │
│ ○ Rent (40)   │ │ price│ │ price│ │ price│ │ price│       │
│ ○ Other (38)  │ └──────┘ └──────┘ └──────┘ └──────┘       │
│ District ▾    │            ‹ 1 2 3 … 7 ›                  │
│ Price min max │                                           │
└───────────────┴──────────────────────────────────────────┘
```

### Post detail (`/posts/[id]`)

Mobile: swipe gallery (dots) → badges (category, status) → title → price → district, date → description → contact buttons (Telegram, Call; full width) → Share / Save / Report row → author card → comments list → sticky comment input.
Desktop: left column (gallery with thumbnails, description, comments); right sticky column (price, contact buttons, author card, share/save/report, map if pinned).

```
Desktop                                 Mobile
┌──────────────────┬───────────┐        ┌───────────────┐
│ [gallery]        │ 300 / mo  │        │ [gallery ••• ]│
│ Title            │ [Telegram]│        │ Title         │
│ description...   │ [Call]    │        │ 300 / mo      │
│ Comments         │ Author    │        │ description   │
│  ...             │ ♡ Share ⚑ │        │ [Telegram]    │
└──────────────────┴───────────┘        │ [Call]        │
                                        │ Comments      │
                                        └───────────────┘
```

Author actions (Edit, Delete, Mark as resolved, Renew) appear in an actions row / "…" menu.

### Create / edit post (`/posts/new`, `/posts/[id]/edit`)

Single column everywhere (max-width 640px on desktop, centered form but left-aligned labels): photos (grid of up to 5, "Add photo" opens camera/gallery) → title → category (segmented control) → price + unit (shown only for Tutoring/Rentals) → district → description → contacts (Telegram, phone) → optional location (map, tap to pin) → [Publish]. Mobile: sticky bottom Publish button.

### Login / Register

Centered card (max 400px) on desktop; full-width on mobile. Fields stacked; link to the other page; language and theme switchers in the header.

### My profile (`/profile`)

Header (initials avatar, username, Student ✓, join date, "Settings" link) → tabs: Active · Resolved · Expired · Removed → my post list with action menu (Edit, Delete, Renew, Resolve).

### Saved (`/saved`)

Same grid/list as browse, heart filled; empty state: "Nothing saved yet" + button "Browse posts".

### Notifications (`/notifications`)

Vertical list, unread has an accent dot and a bold title; tap opens the post/chat and marks read; header action "Mark all as read".

### Messages (`/messages`, `/messages/[id]`)

Desktop: two panes (conversation list left, chat right). Mobile: list page, then full-screen chat with back arrow; message bubbles (mine right, primary tint; theirs left, muted), input fixed at bottom above the safe area.

### Settings (`/settings`)

Sections: Language (3 choices), Theme (light/dark/system), University email (input → "Check your inbox (and spam)" state → Student ✓), Logout.

### About (`/about`)

Text page, max-width 720px: what the site is, how to use it (3 short steps), rules for posting (list).

### Public profile (`/users/[username]`)

Header (initials, username, Student ✓, "Joined March 2026") + their active posts list + "Send message" button.

### Admin (`/admin`)

Desktop: left sidebar (Dashboard, Reports, Posts, Users) + content. Mobile: top bar with a menu button that opens a drawer.

```
Desktop                                   Mobile
┌────────┬─────────────────────────┐      ┌──────────────────┐
│ ▣ Dash │ Users 1,204  Posts 3,120 │      │ ☰ Admin          │
│ ▣ Rep  │ Open reports 12          │      │ [stat][stat]     │
│ ▣ Posts│ ┌─ table ──────────────┐ │      │ ┌ card ────────┐ │
│ ▣ Users│ │ id title status ...  │ │      │ │ title status │ │
│        │ └──────────────────────┘ │      │ │ [Remove]     │ │
└────────┴─────────────────────────┘      └──────────────────┘
```

(The numbers above are illustrative; the real UI shows real data.)

### Offline page

Logo, title "You are offline", one sentence, "Try again" button. Translated.

## 9. States

| State     | Pattern                                                                  |
| --------- | ------------------------------------------------------------------------ |
| Loading   | Skeleton with the same shape as the content; list shows 6 skeleton cards |
| Empty     | EmptyState: illustration, title, sentence, one action                    |
| Error     | ErrorState: translated message from `errors.<code>`, "Try again" button  |
| Success   | Toast; the changed item updates in place                                 |
| Offline   | Offline page for navigation; toast "No connection" for failed mutations  |
| Forbidden | Simple "You cannot open this page" with a Home button                    |

## 10. Motion

Principles: short and calm; animate only `transform` and `opacity`; never block the user; respect reduced motion; same everywhere.

**Tokens** (in `globals.css`): `--duration-fast: 150ms`, `--duration-base: 200ms`, `--duration-slow: 300ms`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.

**Presets** (`client/src/lib/motion.ts`, using `motion/react`): `fadeIn` (opacity 0→1, 200ms) · `slideUp` (y 8→0 + fade, 200ms) · `staggerList` (children delay 40ms, only first 10) · `pop` (scale 1→1.25→1, 250ms) · `scaleIn` (0.96→1 + fade for dialogs/dropdowns) · `press` (`whileTap: { scale: 0.97 }`).

The app is wrapped in `<MotionConfig reducedMotion="user">`. Tailwind `motion-safe:` / `motion-reduce:` guard CSS animations.

| Place                  | Motion                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Page change            | content fades in and moves up 8px (200ms)                                                   |
| Post list and grid     | cards fade in one after another (stagger 40ms, max 10 cards)                                |
| Loading                | skeleton shimmer, smooth fade from skeleton to content                                      |
| Buttons                | press scale 0.97; smooth hover color change (desktop)                                       |
| Heart                  | "pop" scale on tap with optimistic update                                                   |
| Mark as resolved       | status badge changes color with a short check-mark animation                                |
| New comment            | slides in at the end of the list                                                            |
| Delete                 | item fades out, the list closes the gap (layout animation)                                  |
| Bottom sheets / drawer | slide up from the bottom, drag down to close (Vaul)                                         |
| Dialogs and dropdowns  | fade and scale in from 96%                                                                  |
| Toasts                 | slide in, auto-hide, swipe to dismiss                                                       |
| Bottom tab bar         | active icon indicator moves smoothly between tabs (shared `layoutId`)                       |
| Notification bell      | small shake on new notification; badge number counts up                                     |
| Image gallery          | swipe with momentum (Embla), arrows and keyboard on desktop                                 |
| Chips and filters      | smooth selected-state change                                                                |
| Theme switch           | smooth color transition (150ms), no flash on load (next-themes, `suppressHydrationWarning`) |
| Empty states           | gentle fade-in of illustration and text                                                     |
| Form errors            | message slides in under the field; space reserved so the layout does not jump               |

**Test reduced motion:** Windows: Settings → Accessibility → Visual effects → turn off "Animation effects". macOS: Accessibility → Display → Reduce motion. iPhone: Accessibility → Motion → Reduce Motion. Android: Accessibility → Remove animations. Chrome DevTools: Rendering panel → "Emulate CSS prefers-reduced-motion: reduce". Expected: no sliding, scaling or shaking; content simply appears (simple fades at most).

## 11. References (what to borrow)

| Product         | Borrow                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| OLX             | Scannable list of ads, price prominent, thumbnail left on mobile          |
| Avito           | Left filter panel with counts, category chips, clear contact buttons      |
| Linear          | Calm neutral UI, fast feeling, subtle borders, tight typography           |
| Airbnb listings | Photo-first cards, swipeable gallery, sticky action column on detail page |

## 12. Design review checklist (big check days)

- [ ] Only tokens used (no random hex or pixel values)
- [ ] Type scale respected; Tajik letters render correctly
- [ ] Spacing on the 4px scale; consistent gutters
- [ ] One radius for controls (8px), one for cards (12px)
- [ ] Borders instead of heavy shadows
- [ ] Only lucide icons; no emoji as icons
- [ ] Brand green + small amber accent only; no gradients
- [ ] Every screen has loading, empty, error and success states
- [ ] Dark mode checked on every page
- [ ] Contrast ≥ 4.5:1 for text; visible focus ring everywhere
- [ ] Tap targets ≥ 44px; inputs 16px; correct keyboards
- [ ] No horizontal scroll at 360px; safe-area respected
- [ ] Motion follows the table; reduced motion tested
- [ ] All 3 languages: no overflow or truncated labels (Russian and Tajik are longer than English)
- [ ] Microcopy is short, friendly and real
