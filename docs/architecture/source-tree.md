# Momentum - Source Tree

## 1. Overview

This document provides a complete map of the Momentum codebase structure, explaining the purpose of each directory and key files.

---

## 2. Root Directory

```
momentum/
├── .bmad-core/              # BMAD methodology configuration
├── .claude/                 # Claude Code settings
├── .github/                 # GitHub Actions workflows
├── .vscode/                 # VS Code workspace settings
├── apps/                    # Application packages
│   ├── api/                 # Express.js backend
│   └── web/                 # Next.js frontend
├── docker/                  # Docker configurations
├── docs/                    # Project documentation
├── node_modules/            # Dependencies (git-ignored)
├── packages/                # Shared packages
│   └── shared/              # Shared types and utilities
├── web-bundles/             # Pre-built web bundles
├── .dockerignore            # Docker ignore patterns
├── .env.production.example  # Production env template
├── .eslintrc.js             # ESLint configuration
├── .gitignore               # Git ignore patterns
├── .prettierignore          # Prettier ignore patterns
├── .prettierrc              # Prettier configuration
├── package.json             # Root package.json (workspaces)
├── package-lock.json        # Dependency lock file
├── README.md                # Project readme
└── tsconfig.base.json       # Base TypeScript config
```

---

## 3. Backend (apps/api)

```
apps/api/
├── dist/                    # Compiled JavaScript (git-ignored)
├── node_modules/            # Package dependencies
├── prisma/
│   ├── migrations/          # Database migrations
│   ├── schema.prisma        # Database schema definition
│   └── seed.ts              # Database seed script
├── src/
│   ├── generated/
│   │   └── prisma/          # Generated Prisma client
│   ├── lib/
│   │   └── prisma.ts        # Prisma client instance
│   ├── middleware/
│   │   └── auth.middleware.ts  # JWT authentication
│   ├── routes/
│   │   ├── auth.routes.ts      # /api/v1/auth/*
│   │   ├── exercise.routes.ts  # /api/v1/exercises/*
│   │   ├── measurement.routes.ts # /api/v1/measurements/*
│   │   ├── profile.routes.ts   # /api/v1/profile/*
│   │   ├── session.routes.ts   # /api/v1/sessions/*
│   │   └── workout.routes.ts   # /api/v1/workouts/*
│   ├── schemas/
│   │   ├── auth.schema.ts      # Auth validation schemas
│   │   ├── exercise.schema.ts  # Exercise validation
│   │   ├── measurement.schema.ts # Measurement validation
│   │   ├── profile.schema.ts   # Profile validation
│   │   ├── session.schema.ts   # Session validation
│   │   └── workout.schema.ts   # Workout validation
│   ├── services/
│   │   └── auth.service.ts     # Auth business logic
│   └── index.ts             # Express app entry point
├── package.json             # API package config
├── prisma.config.ts         # Prisma configuration
└── tsconfig.json            # TypeScript config
```

### 3.1 Key Files Explained

| File | Purpose |
|------|---------|
| `src/index.ts` | Main Express server setup, middleware, route mounting |
| `src/lib/prisma.ts` | Singleton Prisma client instance |
| `prisma/schema.prisma` | Database models and relations |
| `src/routes/*.routes.ts` | API endpoints organized by resource |
| `src/schemas/*.schema.ts` | Zod validation schemas for requests |
| `src/middleware/auth.middleware.ts` | JWT token verification |

---

## 4. Frontend (apps/web)

```
apps/web/
├── .next/                   # Next.js build output (git-ignored)
├── node_modules/            # Package dependencies
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (app)/           # Authenticated routes (layout group)
│   │   │   ├── exercises/
│   │   │   │   └── page.tsx    # Exercise library page
│   │   │   ├── profile/
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx  # Edit profile page
│   │   │   │   ├── measurements/
│   │   │   │   │   ├── graphs/
│   │   │   │   │   │   └── page.tsx  # Measurement graphs
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx  # Single measurement
│   │   │   │   │   └── page.tsx  # Measurements list
│   │   │   │   └── page.tsx    # Profile overview
│   │   │   ├── workouts/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Create workout
│   │   │   │   ├── [id]/
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx  # Edit workout
│   │   │   │   └── page.tsx    # Workouts list
│   │   │   ├── layout.tsx      # App layout wrapper
│   │   │   └── page.tsx        # Dashboard/home
│   │   ├── (auth)/          # Unauthenticated routes
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (session)/       # Full-screen session routes (no bottom nav)
│   │   │   ├── session/[id]/
│   │   │   │   └── page.tsx    # Active workout session
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts    # Health check endpoint
│   │   ├── backend/
│   │   │   └── [...path]/
│   │   │       └── route.ts    # API proxy to backend
│   │   ├── globals.css         # Global styles + Tailwind
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── exercises/          # Exercise-related components
│   │   │   ├── delete-exercise-dialog.tsx
│   │   │   ├── exercise-card.tsx
│   │   │   ├── exercise-form-modal.tsx
│   │   │   ├── index.ts
│   │   │   ├── muscle-group-badge.tsx
│   │   │   └── muscle-group-filter.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── app-layout.tsx
│   │   │   ├── desktop-sidebar.tsx
│   │   │   ├── mobile-bottom-nav.tsx
│   │   │   ├── nav-item.tsx
│   │   │   └── page-header.tsx
│   │   ├── ui/                 # Shadcn UI components
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── confirm-delete-dialog.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── menu-item.tsx
│   │   │   ├── menu-section.tsx
│   │   │   ├── number-input.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── sortable.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   └── toggle.tsx
│   │   ├── session/            # Active session components
│   │   │   ├── screens/        # Full-page session screens
│   │   │   │   ├── exercise-active-screen.tsx
│   │   │   │   ├── rest-screen.tsx
│   │   │   │   ├── transition-screen.tsx
│   │   │   │   ├── reorder-exercises-screen.tsx
│   │   │   │   ├── session-summary.tsx
│   │   │   │   └── index.ts
│   │   │   ├── timer-block.tsx       # Countdown timer with ±30s
│   │   │   ├── result-input.tsx      # Reps/weight steppers
│   │   │   ├── next-preview.tsx      # Next set/exercise preview
│   │   │   ├── exercise-options-bar.tsx  # Skip/Postpone/Substitute
│   │   │   ├── superset-progress.tsx # Superset round indicator
│   │   │   └── index.ts
│   │   └── workouts/           # Workout-related components
│   │       ├── add-item-dialog.tsx
│   │       ├── exercise-config-drawer.tsx
│   │       ├── exercise-selector.tsx
│   │       ├── rest-time-dialog.tsx
│   │       ├── rest-time-picker.tsx
│   │       ├── superset-config-drawer.tsx
│   │       ├── workout-builder.tsx
│   │       └── workout-item-cards.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-timer-audio.ts  # Web Audio API for countdown
│   │   └── use-wake-lock.ts    # Wake Lock API
│   ├── lib/                    # Utility functions
│   │   └── api/
│   │       ├── sessions.ts     # Session API client
│   │       └── workouts.ts     # Workout API client
│   ├── stores/                 # Zustand stores
│   │   ├── auth.ts             # Authentication state
│   │   └── session.ts          # Active session state
│   └── middleware.ts           # Next.js middleware (auth)
├── next.config.js              # Next.js configuration
├── package.json                # Web package config
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.js          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

### 4.1 Route Groups Explained

| Group | Purpose |
|-------|---------|
| `(app)` | Protected routes requiring authentication |
| `(auth)` | Public routes for login/register |
| `(session)` | Full-screen workout session (no bottom nav) |

### 4.2 Component Organization

| Directory | Purpose |
|-----------|---------|
| `ui/` | Reusable Shadcn/Radix UI primitives |
| `layout/` | App shell, navigation, headers |
| `exercises/` | Exercise library feature components |
| `workouts/` | Workout builder feature components |
| `session/` | Active workout session components |

---

## 5. Shared Package (packages/shared)

```
packages/shared/
├── dist/                    # Compiled output
├── src/
│   ├── types/
│   │   └── index.ts         # Type definitions
│   └── index.ts             # Package exports
├── package.json
└── tsconfig.json
```

### 5.1 Exported Types

```typescript
// User & Auth
export interface User { ... }
export interface ApiResponse<T> { ... }
export interface HealthCheckResponse { ... }

// Exercises
export const MUSCLE_GROUPS = [...] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export interface Exercise { ... }
```

---

## 6. Docker Configuration (docker/)

```
docker/
├── docker-compose.dev.yml   # Development PostgreSQL
├── docker-compose.prod.yml  # Production full stack
├── Dockerfile.api           # API container
└── Dockerfile.web           # Web container
```

---

## 7. Documentation (docs/)

```
docs/
├── architecture/            # Technical documentation
│   ├── coding-standards.md  # Code conventions
│   ├── source-tree.md       # This file
│   └── tech-stack.md        # Technology reference
├── architecture.md          # Main architecture document
├── prd/                     # Product requirements (sharded)
├── prd.md                   # Main PRD
├── qa/                      # QA documentation
└── stories/                 # User stories
```

---

## 8. Database Schema Overview

```
users
  ├── measurements (1:N)
  ├── workouts (1:N)
  │     └── workout_items (1:N)
  │           └── workout_item_exercises (1:N)
  │                 ├── exercise (N:1) ← exercises
  │                 └── workout_sets (1:N)
  └── workout_sessions (1:N)
        └── session_exercises (1:N)
              ├── exercise (N:1) ← exercises
              └── session_sets (1:N)
```

### 8.1 Models

| Model | Table | Purpose |
|-------|-------|---------|
| User | `users` | User accounts |
| Measurement | `measurements` | Body measurements |
| Exercise | `exercises` | Exercise library |
| Workout | `workouts` | Workout templates |
| WorkoutItem | `workout_items` | Items in workout (exercise or superset) |
| WorkoutItemExercise | `workout_item_exercises` | Exercises within items |
| WorkoutSet | `workout_sets` | Set configurations |
| WorkoutSession | `workout_sessions` | Active/completed workout sessions |
| SessionExercise | `session_exercises` | Exercises tracked in a session |
| SessionSet | `session_sets` | Actual results for each set |

---

## 9. API Routes Overview

| Route | File | Methods |
|-------|------|---------|
| `/api/v1/auth/*` | `auth.routes.ts` | POST (register, login, logout) |
| `/api/v1/profile/*` | `profile.routes.ts` | GET, PATCH, PUT |
| `/api/v1/measurements/*` | `measurement.routes.ts` | CRUD |
| `/api/v1/exercises/*` | `exercise.routes.ts` | CRUD |
| `/api/v1/workouts/*` | `workout.routes.ts` | CRUD |
| `/api/v1/sessions/*` | `session.routes.ts` | CRUD, active, exercises, sets |

---

## 10. Import Conventions

### 10.1 Web App Aliases

```typescript
// @/ maps to src/
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
```

### 10.2 Shared Package

```typescript
// Import from @momentum/shared
import { User, MUSCLE_GROUPS, type MuscleGroup } from "@momentum/shared";
```

---

## 11. Key Entry Points

| Purpose | File |
|---------|------|
| API Server | `apps/api/src/index.ts` |
| Web App | `apps/web/src/app/layout.tsx` |
| Shared Types | `packages/shared/src/index.ts` |
| Database Schema | `apps/api/prisma/schema.prisma` |
| Root Scripts | `package.json` |
