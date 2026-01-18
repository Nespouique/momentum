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

## Production Deployment

### Prerequisites

- Docker and Docker Compose installed on the server
- DockerHub account (for pulling images)
- Domain names configured for frontend and API

### Quick Start

1. **Clone and configure environment**
   ```bash
   git clone https://github.com/yourusername/momentum.git
   cd momentum
   cp .env.production.example .env
   ```

2. **Edit `.env` with your production values**
   ```bash
   nano .env
   ```

   Required variables:
   - `DOCKERHUB_USERNAME`: Your DockerHub username
   - `DB_PASSWORD`: Strong database password
   - `JWT_SECRET`: Secret key for JWT tokens (min 32 chars)
   - `FRONTEND_URL`: Your frontend domain (e.g., `https://momentum.example.com`)
   - `API_URL`: Your API domain (e.g., `https://api.momentum.example.com`)

3. **Pull and start services**
   ```bash
   docker compose -f docker/docker-compose.prod.yml pull
   docker compose -f docker/docker-compose.prod.yml up -d
   ```

4. **Run database migrations**
   ```bash
   docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate deploy
   ```

5. **Verify services are healthy**
   ```bash
   # Check all services
   docker compose -f docker/docker-compose.prod.yml ps

   # Check health endpoints
   curl http://localhost:3000/api/health
   curl http://localhost:3001/health
   ```

### Reverse Proxy Setup (Nginx Proxy Manager)

If using Nginx Proxy Manager:

1. Add proxy host for frontend:
   - Domain: `momentum.yourdomain.com`
   - Forward hostname: `localhost` (or container IP)
   - Forward port: `3000`
   - Enable SSL with Let's Encrypt

2. Add proxy host for API:
   - Domain: `api.momentum.yourdomain.com`
   - Forward hostname: `localhost` (or container IP)
   - Forward port: `3001`
   - Enable SSL with Let's Encrypt

### Updating

To update to the latest version:

```bash
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Logs

```bash
# All services
docker compose -f docker/docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker/docker-compose.prod.yml logs -f api
```

## CI/CD

The project includes a GitHub Actions workflow that:

1. **On every PR and push to main**: Runs lint and build checks
2. **On push to main only**: Builds and pushes Docker images to DockerHub

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your DockerHub username |
| `DOCKERHUB_TOKEN` | DockerHub access token |

### Image Tags

- `latest`: Most recent build from main branch
- `<short-sha>`: Specific commit (e.g., `abc1234`)
