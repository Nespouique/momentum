# Momentum - Tech Stack

## 1. Overview

Momentum is a **full-stack monorepo** application built with modern TypeScript technologies. This document provides a comprehensive reference of all technologies, their versions, and purposes.

---

## 2. Project Structure

```
momentum/                     # Monorepo root
├── apps/
│   ├── api/                 # Express.js backend
│   └── web/                 # Next.js frontend
├── packages/
│   └── shared/              # Shared types and utilities
└── docker/                  # Docker configurations
```

**Workspace Manager**: npm workspaces

---

## 3. Frontend Stack (apps/web)

### 3.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | React framework with App Router, SSR |
| **React** | 18.x | UI library |
| **TypeScript** | 5.7.x | Type-safe JavaScript |

### 3.2 Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.x | Utility-first CSS framework |
| **Shadcn UI** | - | Radix-based component library. We need to use always shadcn components to avoir custom components |
| **class-variance-authority** | 0.7.x | Component variant management |
| **clsx** | 2.x | Conditional class names |
| **tailwind-merge** | 3.x | Merge Tailwind classes without conflicts |

### 3.3 UI Components (Radix UI)

| Component | Package |
|-----------|---------|
| Avatar | `@radix-ui/react-avatar` |
| Checkbox | `@radix-ui/react-checkbox` |
| Collapsible | `@radix-ui/react-collapsible` |
| Dialog | `@radix-ui/react-dialog` |
| Dropdown Menu | `@radix-ui/react-dropdown-menu` |
| Label | `@radix-ui/react-label` |
| Popover | `@radix-ui/react-popover` |
| Select | `@radix-ui/react-select` |
| Separator | `@radix-ui/react-separator` |
| Tabs | `@radix-ui/react-tabs` |
| Toast | `@radix-ui/react-toast` |
| Toggle | `@radix-ui/react-toggle` |
| Toggle Group | `@radix-ui/react-toggle-group` |

### 3.4 State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | 5.x | Lightweight client state management |

### 3.5 Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Hook Form** | 7.x | Form state management |
| **@hookform/resolvers** | 5.x | Zod integration for RHF |
| **Zod** | 4.x | Schema validation |

### 3.6 Data Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Recharts** | 2.x | Charts and graphs |

### 3.7 Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **date-fns** | 4.x | Date manipulation |
| **lucide-react** | 0.562.x | Icon library |
| **react-day-picker** | 9.x | Date picker component |
| **next-themes** | 0.4.x | Theme (dark mode) management |
| **sonner** | 2.x | Toast notifications |
| **vaul** | 1.x | Drawer component |

### 3.8 Drag & Drop

| Technology | Package | Purpose |
|------------|---------|---------|
| DnD Kit Core | `@dnd-kit/core` | Core drag and drop |
| DnD Kit Sortable | `@dnd-kit/sortable` | Sortable lists |
| DnD Kit Modifiers | `@dnd-kit/modifiers` | Drag modifiers |
| DnD Kit Utilities | `@dnd-kit/utilities` | Utility functions |

---

## 4. Backend Stack (apps/api)

### 4.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20 LTS | JavaScript runtime |
| **Express.js** | 4.x | Web framework |
| **TypeScript** | 5.7.x | Type-safe JavaScript |
| **tsx** | 4.x | TypeScript execution with hot reload |

### 4.2 Database

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16.x | Relational database |
| **Prisma** | 7.x | ORM & database toolkit |
| **@prisma/adapter-pg** | 7.x | PostgreSQL driver adapter |
| **pg** | 8.x | PostgreSQL client |

### 4.3 Authentication & Security

| Technology | Version | Purpose |
|------------|---------|---------|
| **bcrypt** | 6.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT token generation/verification |
| **helmet** | 8.x | Security HTTP headers |
| **cors** | 2.x | Cross-Origin Resource Sharing |

### 4.4 Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| **Zod** | 4.x | Schema validation |

### 4.5 Development

| Technology | Version | Purpose |
|------------|---------|---------|
| **tsx** | 4.x | TypeScript execution with watch mode |

---

## 5. Shared Package (packages/shared)

### 5.1 Purpose

- TypeScript type definitions shared between frontend and backend
- Constants and enums (e.g., `MUSCLE_GROUPS`)
- API response interfaces

### 5.2 Contents

```typescript
// Types exported
export interface User { ... }
export interface Exercise { ... }
export interface ApiResponse<T> { ... }
export const MUSCLE_GROUPS = [...] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
```

---

## 6. Development Tools

### 6.1 Monorepo Root

| Technology | Version | Purpose |
|------------|---------|---------|
| **npm workspaces** | - | Monorepo package management |
| **concurrently** | 9.x | Run multiple commands |
| **ESLint** | 8.x | Code linting |
| **Prettier** | 3.x | Code formatting |
| **TypeScript** | 5.x | Type checking |

### 6.2 ESLint Plugins

- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint-config-prettier`

---

## 7. Infrastructure

### 7.1 Containerization

| Technology | Purpose |
|------------|---------|
| **Docker** | Application containerization |
| **Docker Compose** | Local development orchestration |

### 7.2 Production Environment

| Technology | Purpose |
|------------|---------|
| **Proxmox LXC** | Container host |
| **Nginx Proxy Manager** | Reverse proxy & SSL |
| **Portainer** | Container management UI |

---

## 8. Available Scripts

### 8.1 Root (package.json)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start both API and Web in dev mode |
| `dev:api` | `npm run dev:api` | Start API only |
| `dev:web` | `npm run dev:web` | Start Web only |
| `build` | `npm run build` | Build shared, then API, then Web |
| `lint` | `npm run lint` | Lint all workspaces |
| `format` | `npm run format` | Format code with Prettier |
| `format:check` | `npm run format:check` | Check formatting |
| `db:start` | `npm run db:start` | Start PostgreSQL container |
| `db:stop` | `npm run db:stop` | Stop PostgreSQL container |
| `db:reset` | `npm run db:reset` | Reset database (delete volumes) |

### 8.2 API (apps/api/package.json)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/index.ts` | Development with hot reload |
| `build` | `prisma generate && tsc` | Build for production |
| `start` | `node dist/index.js` | Start production server |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:migrate` | `prisma migrate dev` | Run migrations |
| `db:push` | `prisma db push` | Push schema to database |
| `db:studio` | `prisma studio` | Open Prisma Studio |
| `db:seed` | `prisma db seed` | Seed database |

### 8.3 Web (apps/web/package.json)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Lint Next.js app |

---

## 9. Environment Variables

### 9.1 API (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/momentum"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="development"
```

### 9.2 Web (.env.local)

```bash
# API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 10. Version Requirements

### 10.1 Minimum Versions

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20.0.0 |
| npm | >= 10.0.0 |
| PostgreSQL | >= 16.0 |

### 10.2 Recommended IDE

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)

---

## 11. Development Workflow Notes

### 11.1 Important: Server Management

**DO NOT start development servers automatically** when running Claude Code or other AI assistants. The developer runs servers in separate terminals to:

1. **Preserve hot reload**: Avoid restarting servers when checking compilation
2. **Better log visibility**: Keep server logs in dedicated terminals
3. **Independent control**: Restart only what's needed

**Recommended workflow:**
```bash
# Terminal 1: Database
npm run db:start

# Terminal 2: API (with hot reload via tsx watch)
npm run dev:api

# Terminal 3: Web (with hot reload via Next.js)
npm run dev:web
```

### 11.2 Build Verification

To verify TypeScript compilation without restarting servers:
```bash
# Check types only (no emit)
npx tsc --noEmit -p apps/api
npx tsc --noEmit -p apps/web

# Or use the build command which includes type checking
npm run build -w @momentum/shared  # Build shared first
npm run build -w @momentum/api     # Then API
npm run build -w @momentum/web     # Then Web
```
