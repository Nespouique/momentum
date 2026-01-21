# Momentum - Coding Standards

## 1. Overview

This document defines the coding standards and conventions for the Momentum project. All contributors must follow these guidelines to maintain code consistency and quality.

---

## 2. TypeScript Standards

### 2.1 General Rules

- **Strict TypeScript**: All code must be strictly typed
- **No `any`**: The use of `any` is prohibited (`@typescript-eslint/no-explicit-any: error`)
- **Unused Variables**: Prefix unused variables with `_` (e.g., `_unusedParam`)
- **Target**: ES2022

### 2.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables & Functions | camelCase | `getUserById`, `isActive` |
| Constants | SCREAMING_SNAKE_CASE | `MUSCLE_GROUPS`, `API_BASE_URL` |
| Types & Interfaces | PascalCase | `User`, `WorkoutSession` |
| Enums | PascalCase | `SessionStatus` |
| Files (Components) | kebab-case | `workout-builder.tsx` |
| Files (Other) | kebab-case | `auth.routes.ts`, `prisma.ts` |

### 2.3 Type Definitions

```typescript
// Prefer interfaces for object shapes
export interface User {
  id: string;
  email: string;
  name: string;
}

// Use type for unions, intersections, or computed types
export type SessionStatus = "in_progress" | "completed" | "abandoned";

// Use const assertions for literal arrays
export const MUSCLE_GROUPS = [
  "abdos",
  "biceps",
  "dos",
  // ...
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
```

---

## 3. Code Formatting (Prettier)

### 3.1 Configuration

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### 3.2 Key Rules

- **Semicolons**: Required at end of statements
- **Quotes**: Double quotes for strings (`"string"`)
- **Indentation**: 2 spaces (no tabs)
- **Trailing Commas**: ES5 compatible (arrays, objects)
- **Line Width**: Maximum 100 characters
- **Arrow Functions**: Always use parentheses `(x) => x`

---

## 4. ESLint Rules

### 4.1 Enabled Rules

- `eslint:recommended`
- `@typescript-eslint/recommended`
- `prettier` (disables conflicting rules)

### 4.2 Custom Rules

```javascript
{
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
  ],
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-explicit-any": "error"
}
```

### 4.3 Ignored Paths

- `node_modules`
- `dist`
- `.next`
- `*.config.js`
- `*.config.mjs`

---

## 5. React/Next.js Standards

### 5.1 Component Structure

```typescript
// 1. Imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Types/Interfaces
interface WorkoutCardProps {
  workout: Workout;
  onDelete?: (id: string) => void;
}

// 3. Component
export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  // 3a. Hooks
  const [isDeleting, setIsDeleting] = useState(false);

  // 3b. Handlers
  const handleDelete = async () => {
    setIsDeleting(true);
    // ...
  };

  // 3c. Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### 5.2 File Organization

```
components/
  feature-name/
    index.ts           # Exports
    feature-card.tsx   # Main component
    feature-form.tsx   # Form component
    feature-list.tsx   # List component
```

### 5.3 Import Aliases

- `@/` maps to `src/` in the web app
- Use absolute imports for cross-folder references

```typescript
// Good
import { Button } from "@/components/ui/button";

// Avoid
import { Button } from "../../../components/ui/button";
```

### 5.4 State Management

- **Server State**: Use Zustand stores with fetch functions
- **Local UI State**: Use React's `useState`/`useReducer`
- **Forms**: Use `react-hook-form` with `zod` validation

---

## 6. Backend Standards

### 6.1 Express Route Structure

```typescript
// routes/feature.routes.ts
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { featureSchema } from "../schemas/feature.schema";

const router = Router();

// GET /api/v1/features
router.get("/", async (req: Request, res: Response) => {
  try {
    const features = await prisma.feature.findMany();
    res.json({ data: features });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
```

### 6.2 Schema Validation (Zod)

```typescript
// schemas/feature.schema.ts
import { z } from "zod";

export const createFeatureSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
```

### 6.3 Prisma Conventions

- Use `@map("snake_case")` for database column names
- Model names are PascalCase singular (`User`, not `Users`)
- Table names use `@@map("plural_snake_case")`

```prisma
model User {
  id           String   @id @default(uuid())
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

---

## 7. API Response Format

### 7.1 Success Response

```typescript
// Single item
{
  "data": { ... }
}

// Collection
{
  "data": [ ... ],
  "total": 42
}

// With pagination
{
  "data": [ ... ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### 7.2 Error Response

```typescript
{
  "error": "Error message here"
}

// With details
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

---

## 8. Git Conventions

### 8.1 Commit Messages

Use conventional commits:

```
type(scope): description

feat(auth): add JWT token refresh
fix(workouts): correct exercise order calculation
docs(readme): update installation instructions
refactor(api): simplify measurement routes
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 8.2 Branch Naming

```
feature/description
fix/issue-description
refactor/component-name
```

---

## 9. Testing Standards

### 9.1 File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### 9.2 Test Structure

```typescript
describe("FeatureName", () => {
  describe("methodName", () => {
    it("should do expected behavior", () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

---

## 10. Security Guidelines

### 10.1 Authentication

- Passwords hashed with bcrypt (cost factor 10+)
- JWT tokens for API authentication
- Tokens stored in httpOnly cookies (production)

### 10.2 Input Validation

- All user input validated with Zod schemas
- SQL injection prevented via Prisma ORM
- XSS prevented via React's default escaping

### 10.3 Security Headers

Helmet.js middleware provides:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HTTPS)

---

## 11. Performance Guidelines

### 11.1 Database

- Use Prisma `select` to fetch only needed fields
- Add indexes for frequently queried fields
- Use pagination for large datasets

### 11.2 Frontend

- Lazy load routes with Next.js dynamic imports
- Optimize images with Next.js Image component
- Minimize bundle size with tree shaking

---

## 12. Documentation

### 12.1 Code Comments

- Prefer self-documenting code over comments
- Use JSDoc for public APIs and complex functions
- Keep comments up-to-date with code changes

```typescript
/**
 * Calculates the one-rep max (1RM) using the Epley formula.
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions performed
 * @returns Estimated one-rep max in kg
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}
```

### 12.2 README Files

Each package should have a README with:
- Purpose and overview
- Setup instructions
- Available scripts
- Environment variables
