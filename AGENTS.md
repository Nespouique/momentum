# AGENTS.md — Momentum

Fitness tracking app: Next.js 16 frontend + Express.js API + shared types package.
Monorepo with npm workspaces. Node.js >= 20. TypeScript strict everywhere.

## Workspace Structure

```
apps/web/        → @momentum/web   (Next.js 16, App Router, port 3000)
apps/api/        → @momentum/api   (Express.js 4 + Prisma 7, port 3001)
packages/shared/ → @momentum/shared (shared TypeScript types)
```

## Build & Dev Commands

```bash
# Full dev (API + Web concurrently)
npm run dev

# Individual workspaces
npm run dev:api
npm run dev:web

# Build all (shared → api → web, sequential)
npm run build

# Build individual
npm run build -w apps/api
npm run build -w apps/web
npm run build -w packages/shared

# Database (PostgreSQL 16 via Docker)
npm run db:start          # Start PostgreSQL container
npm run db:stop           # Stop PostgreSQL container
npm run db:reset          # Destroy + recreate volume

# Prisma (run from apps/api)
npm run db:migrate -w apps/api   # prisma migrate dev
npm run db:push -w apps/api      # prisma db push
npm run db:studio -w apps/api    # prisma studio
npm run db:seed -w apps/api      # prisma db seed
```

## Lint & Format

```bash
npm run lint               # ESLint across all workspaces
npm run format             # Prettier --write on entire repo
npm run format:check       # Prettier --check
```

- ESLint 8 + @typescript-eslint v7 + eslint-config-prettier
- `no-explicit-any` is an **error** — never use `any`
- Unused vars prefixed with `_` are allowed (`argsIgnorePattern: "^_"`)
- Prettier: double quotes, semicolons, trailing commas (es5), 100 char width, 2-space indent

## Tests

No test framework is configured. No test files exist in the codebase.

## TypeScript

Strict mode with extra strictness flags:

- `noUncheckedIndexedAccess: true` — indexed access returns `T | undefined`
- `noPropertyAccessFromIndexSignature: true` — use bracket notation for index sigs
- `noImplicitOverride: true` — explicit `override` keyword required
- `noFallthroughCasesInSwitch: true`
- Target: ES2022 (API), ES2017 (Web)

API uses `moduleResolution: "NodeNext"` — **always add `.js` extension** to relative imports:

```typescript
import { prisma } from "./lib/prisma.js";
```

Web uses `moduleResolution: "bundler"` — no `.js` extension needed.

### Path Aliases

| Alias       | Resolves to                   | Used in  |
| ----------- | ----------------------------- | -------- |
| `@/*`       | `./src/*`                     | Web      |
| `@shared/*` | `../../packages/shared/src/*` | API, Web |

## Code Style

### File Naming

- All files: `kebab-case`
- API suffix convention: `*.routes.ts`, `*.service.ts`, `*.schema.ts`, `*.middleware.ts`
- Web components: `kebab-case.tsx` (e.g., `exercise-card.tsx`)
- Hooks: `use-*.ts` (e.g., `use-timer-audio.ts`)

### Naming Conventions

- Components: `PascalCase` (`ExerciseCard`, `PageHeader`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (`MUSCLE_GROUPS`, `JWT_EXPIRES_IN`)
- Types/Interfaces: `PascalCase` (`AuthRequest`, `ApiResponse<T>`)
- Zod schemas: `camelCase` + `Schema` suffix (`registerSchema`, `loginSchema`)
- Inferred Zod types: `PascalCase` + `Input`/`FormData` suffix (`RegisterInput`)

### Import Order

**API:**

```typescript
import "dotenv/config"; // 1. Side-effect imports
import express from "express"; // 2. External dependencies
import type { HealthCheckResponse } from "@momentum/shared"; // 3. Shared types
import { prisma } from "./lib/prisma.js"; // 4. Local (with .js ext)
```

**Web:**

```typescript
"use client"; // 0. Directive (if needed)
import { useEffect, useState } from "react"; // 1. React
import { PageHeader } from "@/components/layout"; // 2. Internal via alias
import { useAuthStore } from "@/stores/auth"; // 3. Stores
import { getToday } from "@/lib/api/tracking"; // 4. API/lib
import { toast } from "sonner"; // 5. External libs
```

### Barrel Exports

Components use `index.ts` files for re-exports:

```typescript
export { AppLayout } from "./app-layout";
export { PageHeader } from "./page-header";
```

## API Patterns

### Route Files

Each route file exports a default Express Router scoped to a domain:

```typescript
const router = Router();
router.post("/", authMiddleware, handler);
export default router;
```

### Validation

Zod schemas in `src/schemas/`. Validate with `.parse()` in route handlers.

### Error Handling

Structured error responses with `ErrorCodes`:

```typescript
try {
  const data = schema.parse(req.body);
  // ... business logic
} catch (error) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: formatZodError(error),
      },
    });
  }
  console.error("Context:", error);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}
```

### Auth

JWT stateless auth via `authMiddleware`. The middleware extends `Request` as `AuthRequest` adding `userId` and `userEmail`.

### Database

Prisma 7 with PostgreSQL adapter (pg). Singleton instance in `src/lib/prisma.ts`.
Schema: `apps/api/prisma/schema.prisma` (17 models).

## Web Patterns

### Framework & UI Stack

- Next.js 16 App Router with route groups: `(app)`, `(auth)`, `(session)`
- Shadcn/ui (`new-york-v4` style, zinc base color) + Radix primitives
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- Icons: `lucide-react` + `@lucide/lab`

### State Management

Zustand stores with persist middleware:

- `src/stores/auth.ts` — auth state + cookie sync
- `src/stores/session.ts` — workout session state machine

### API Client

Functions in `src/lib/api/*.ts`. Requests go through a Next.js proxy route at
`src/app/backend/[...path]/route.ts` which forwards to the Express API (avoids CORS).

### Forms

`react-hook-form` + `@hookform/resolvers` + Zod. Frontend validation messages are in French.

### Error Handling (Frontend)

```typescript
try {
  const data = await apiCall(token);
} catch (error) {
  console.error("Context:", error);
  toast.error("User-facing message in French");
}
```

### Dark Mode

Hardcoded dark theme via `className="dark"` on root. CSS variables in `globals.css`.

## Key Dependencies

| Category | Stack                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Frontend | Next.js 16, React 19, Tailwind v4, Shadcn/ui, Zustand, react-hook-form, Zod v4, recharts, dnd-kit, sonner, date-fns |
| Backend  | Express 4, Prisma 7, bcrypt, jsonwebtoken, helmet, cors, Zod v4, OpenAI SDK, Resend                                 |
| Database | PostgreSQL 16 (Docker)                                                                                              |

## Important Notes

- The app UI is in **French** — user-facing strings, validation messages, toasts are all in French
- Code (variables, comments, commits) is in **English**
- PWA: `manifest.json` + service worker in `apps/web/public/`
- CI/CD: GitHub Actions runs `npm run lint` then `npm run build` on every push/PR to `main`
- BMAD project management framework is in `.opencode/` and `_bmad*/` — do not modify

### Git

**Never commit unless explicitly asked.** Do not stage, commit, or push changes on your own.
The user will ask when they want a commit.

**Always run `npm run lint` before committing** to catch errors that will fail CI. The GitHub
Actions workflow runs lint → build, and lint failures (especially `no-explicit-any` and
unused imports) are the most common cause of CI failures.

### Avoid unnecessary rebuilds during dev

**Do NOT run `npm run build` while `npm run dev` is running.** Next.js dev server uses
hashed filenames for CSS/JS chunks (e.g., `chunk-abc123.css`). A full rebuild regenerates
these hashes, causing the browser to 404 on assets it still references under the old names
until a hard refresh.

Instead, scope changes to the workspace that actually changed:

- API-only change → `npm run build -w apps/api` (won't touch the web dev server)
- Shared types change → `npm run build -w packages/shared` (the dev servers pick up the
  new types via hot reload)
- Web changes require **no manual build** — the Next.js dev server handles HMR automatically

Only run the full `npm run build` for production or CI verification, never during active
development.
