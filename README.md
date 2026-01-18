# Momentum

A fitness tracking application built with Next.js and Express.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript, Prisma ORM
- **Database**: PostgreSQL 16
- **Shared**: TypeScript types shared between frontend and backend

## Project Structure

```
momentum/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Express.js backend (port 3001)
├── docker/           # Docker Compose files
├── packages/
│   └── shared/       # Shared TypeScript types
├── package.json      # Workspaces root
└── tsconfig.base.json
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start PostgreSQL database:
   ```bash
   npm run db:start
   ```

3. Run database migrations:
   ```bash
   cd apps/api
   npm run db:migrate
   ```

4. (Optional) Seed the database:
   ```bash
   cd apps/api
   npm run db:seed
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend at http://localhost:3000
   - Backend at http://localhost:3001

## Scripts

### Root Scripts
- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run db:start` - Start PostgreSQL container
- `npm run db:stop` - Stop PostgreSQL container
- `npm run db:reset` - Reset database (delete all data)

### API Scripts (run from `apps/api`)
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed the database

## Environment Variables

Copy `.env.example` to `.env` in `apps/api`:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://momentum:momentum_dev@localhost:5432/momentum` |
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Environment | `development` |

## Development

### Adding shared types

Add types to `packages/shared/src/types/index.ts` and import them in your apps:

```typescript
import type { User } from "@momentum/shared";
```

### Database

The database schema is managed with Prisma. Schema file is at `apps/api/prisma/schema.prisma`.

To create a new migration after schema changes:
```bash
cd apps/api
npm run db:migrate
```
