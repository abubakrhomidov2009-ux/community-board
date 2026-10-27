# 07. Coding Standards

## Naming

| Thing                      | Convention                               | Example                                  |
| -------------------------- | ---------------------------------------- | ---------------------------------------- |
| Folders, files (backend)   | kebab-case with Nest suffix              | `posts.service.ts`, `create-post.dto.ts` |
| Files (frontend)           | components PascalCase, others kebab-case | `PostCard.tsx`, `query-client.ts`        |
| Classes, components, types | PascalCase                               | `PostsService`, `PostCard`               |
| Variables, functions       | camelCase                                | `getPostById`                            |
| Constants                  | UPPER_SNAKE_CASE                         | `MAX_IMAGES_PER_POST`                    |
| Enums (Prisma)             | UPPER_SNAKE_CASE values                  | `LOST_FOUND`                             |
| Error codes                | UPPER_SNAKE_CASE                         | `POST_NOT_FOUND`                         |
| DB models                  | PascalCase singular                      | `Post`                                   |
| Query keys                 | `<feature>Keys`                          | `postKeys.detail(id)`                    |
| Translation keys           | dot path, camelCase leaves               | `posts.create.submit`                    |
| Branches                   | `main`, `dev`, `feature/<name>`          | `feature/favorites`                      |

## Folders

Follow the tree in docs/02-SPEC.md exactly. Backend code only in `server/`, frontend only in `client/`. Never install frontend packages in `server/` or the other way. Frontend feature code lives in `client/src/features/<feature>/`; shared UI in `components/shared`; shadcn primitives in `components/ui`.

## ESLint + Prettier

- Prettier config at the root (`.prettierrc`); `prettier-plugin-tailwindcss` sorts classes in `client/`.
- ESLint: `server/eslint.config.mjs` (typescript-eslint), `client/eslint.config.mjs` (Next + `@tanstack/eslint-plugin-query` + `eslint-plugin-i18next`).
- i18n rule (client): `i18next/no-literal-string` is an **error** for JSX text and common props (`placeholder`, `title`, `aria-label`, `alt`). Allowed: translation keys, URLs, class names, test files. If a literal is truly not UI text, add a short comment explaining why next to the `eslint-disable-next-line`.
- Run `npm run lint` before every commit; CI runs it too.

## Husky + lint-staged

`.husky/pre-commit` runs `npx lint-staged` which runs `prettier --write` on staged files. After a fresh clone run `npm run prepare`. Do not skip hooks (`--no-verify`).

## Git

- `main` = deployable. `dev` = integration. `feature/*` = one feature group each. In this project, with one developer, work happens on `dev` or feature branches and is merged into `main` at the end of each day.
- **Conventional Commits:** `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `test: ...`, `chore: ...`, `ci: ...`, `refactor: ...`. Imperative, lowercase, no period, under 72 chars. Scope = module or feature (`posts`, `auth`, `client`).
- Commit at the end of each finished feature group. Tag `api-v1.0.0` at the backend gate.

## Backend patterns

**DTOs** (`dto/create-post.dto.ts`): class-validator decorators + `@ApiProperty` with `example` and `description`. Strings get `@Transform(trim)`.

```ts
export class CreatePostDto {
  @ApiProperty({ example: 'Math tutor for first-year students', minLength: 5, maxLength: 120 })
  @IsString()
  @Length(5, 120)
  title: string;

  @ApiProperty({ enum: Category, example: Category.TUTORING })
  @IsEnum(Category)
  category: Category;
}
```

**Response DTOs:** every endpoint returns a documented class (`PostResponseDto`, `PaginatedPostsResponseDto`). Services map Prisma objects to response shapes explicitly (never return `passwordHash`).

**Services:** all business rules, throw `AppException(ErrorCode.X, HttpStatus.Y)`; never build user-facing text. Take the current user id as a parameter, never read from the request.

**Controllers:** thin. `@ApiTags`, `@ApiOperation`, `@ApiResponse` for 200/201 + each error, `@UseGuards(JwtAuthGuard)`, `@Roles(Role.ADMIN)` where needed, `@Throttle` for sensitive routes.

**Tests:** `*.service.spec.ts` next to each service (Prisma mocked); e2e in `server/test/*.e2e-spec.ts` with Supertest against a test database.

## Frontend patterns

**Query keys** (`features/posts/queries.ts`):

```ts
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
};
```

**Queries:** `useQuery({ queryKey: postKeys.list(filters), queryFn: () => postsApi.list(filters), placeholderData: keepPreviousData })`.

**Mutations:** `useMutation` with `onSuccess` invalidating keys; optimistic updates (`onMutate` snapshot → `setQueryData`, `onError` rollback, `onSettled` invalidate) for favorites and notifications. Show a translated toast on success and a translated error (from `errors.<code>`) on failure.

**API calls** (`api.ts`): only through `lib/api/axios.ts`; types from `lib/api/schema.d.ts`. No `any`; no guessed shapes.

**Forms:** react-hook-form + `zodResolver`; Zod messages are translation keys; field errors animate in; inputs ≥ 16px; correct `type`/`inputMode`.

**TanStack Table columns:** defined in `features/admin/columns/<name>.columns.tsx` with `ColumnDef<Row>[]`; headers use `t()`; server-side `manualPagination`, `manualSorting`; the mobile card view reuses the same row data.

**Responsive components:** mobile-first Tailwind (`base` = mobile, `md:`, `lg:`); one component per concept, with layout switching inside it (`hidden lg:block`) or via a `useMediaQuery` hook only when markup must differ (sheet vs panel). Touch targets ≥ 44px. No hover-only actions.

**Translation keys:** add the key to `en.json` first, then `tg.json` and `ru.json`; run `npm run i18n:check`. Use `useTranslations('posts.create')` per area. Dates/numbers/prices via `useFormatter()`.

**Motion:** import presets from `lib/motion.ts`; animate only `transform` and `opacity`; wrap the app in `MotionConfig reducedMotion="user"`.

**Comments:** write comments only where the reason is not obvious from the code.

**Security habits:** validate every input; check ownership in services; never trust the role from the client; no secrets in code.
