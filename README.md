# Momentum

A fitness tracking application built with Next.js and Express.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with TypeScript, Prisma ORM 7
- **Database**: PostgreSQL 16
- **Shared**: TypeScript types shared between frontend and backend
- **Deployment**: Docker, GitHub Actions CI/CD

## Project Structure

```
momentum/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Express.js backend (port 3001)
├── docker/           # Dockerfiles and docker-compose
├── packages/
│   └── shared/       # Shared TypeScript types
├── docs/             # Stories and documentation
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

The database schema is managed with Prisma 7. Schema file is at `apps/api/prisma/schema.prisma`.

To create a new migration after schema changes:
```bash
cd apps/api
npm run db:migrate
```

---

## Production Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy (Nginx)                        │
│         momentum.domain.com    api.momentum.domain.com          │
└──────────────┬────────────────────────────┬─────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│    momentum-web (3000)   │   │    momentum-api (3001)   │
│       Next.js App        │──▶│      Express + Prisma    │
│  (proxy /backend/* → api)│   │   (auto-migrate on start)│
└──────────────────────────┘   └────────────┬─────────────┘
                                            │
                                            ▼
                               ┌──────────────────────────┐
                               │   PostgreSQL 16 (5432)   │
                               │      postgres_data       │
                               └──────────────────────────┘
                                            ▲
                               ┌────────────┴─────────────┐
                               │  prisma-studio (5555)    │
                               │    Database Admin UI     │
                               └──────────────────────────┘
```

### Key Features

- **Auto-migrations**: API container runs `prisma migrate deploy` on startup
- **Internal proxy**: Frontend proxies `/backend/*` requests to API (no CORS issues)
- **Healthchecks**: All services include Docker healthchecks
- **Non-root users**: Containers run as non-root for security
- **Prisma Studio**: Optional web UI to manage database (port 5555)

### Prerequisites

- Docker and Docker Compose installed on the server
- Domain names configured (e.g., `momentum.domain.com`, `api.momentum.domain.com`)
- Reverse proxy (Nginx Proxy Manager, Traefik, etc.)

### Quick Start

1. **Create deployment directory and docker-compose.yml**
   ```bash
   mkdir -p /opt/momentum && cd /opt/momentum
   ```

2. **Create `docker-compose.yml`**
   ```yaml
   services:
     web:
       image: nespouique/momentum-web:latest
       ports:
         - "3000:3000"
       environment:
         - API_URL=http://api:3001
       depends_on:
         api:
           condition: service_healthy
       healthcheck:
         test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 40s
       restart: unless-stopped

     api:
       image: nespouique/momentum-api:latest
       ports:
         - "3001:3001"
       environment:
         - DATABASE_URL=postgresql://momentum:YOUR_DB_PASSWORD@postgres:5432/momentum
         - JWT_SECRET=YOUR_JWT_SECRET_MIN_32_CHARS
         - FRONTEND_URL=https://momentum.yourdomain.com
         - NODE_ENV=production
       depends_on:
         postgres:
           condition: service_healthy
       healthcheck:
         test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/health"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 10s
       restart: unless-stopped

     postgres:
       image: postgres:16-alpine
       environment:
         - POSTGRES_USER=momentum
         - POSTGRES_PASSWORD=YOUR_DB_PASSWORD
         - POSTGRES_DB=momentum
       volumes:
         - postgres_data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U momentum"]
         interval: 10s
         timeout: 5s
         retries: 5
       restart: unless-stopped

     prisma-studio:
       image: nespouique/momentum-api:latest
       container_name: momentum-prisma-studio
       ports:
         - "5555:5555"
       environment:
         - DATABASE_URL=postgresql://momentum:YOUR_DB_PASSWORD@postgres:5432/momentum
       command: npx prisma studio --port 5555 --browser none
       depends_on:
         postgres:
           condition: service_healthy
       restart: unless-stopped

   volumes:
     postgres_data:
   ```

3. **Replace placeholders**
   - `YOUR_DB_PASSWORD`: Strong database password
   - `YOUR_JWT_SECRET_MIN_32_CHARS`: JWT secret (generate with `openssl rand -base64 32`)
   - `https://momentum.yourdomain.com`: Your actual frontend domain

4. **Start services**
   ```bash
   docker compose pull
   docker compose up -d
   ```

5. **Verify services are healthy**
   ```bash
   docker compose ps
   curl http://localhost:3000/api/health
   curl http://localhost:3001/health
   ```

### Reverse Proxy Setup (Nginx Proxy Manager)

1. **Frontend proxy host**:
   - Domain: `momentum.yourdomain.com`
   - Forward hostname/IP: `localhost` or server IP
   - Forward port: `3000`
   - Enable SSL with Let's Encrypt

2. **API proxy host** (optional, only if direct API access needed):
   - Domain: `api.momentum.yourdomain.com`
   - Forward hostname/IP: `localhost` or server IP
   - Forward port: `3001`
   - Enable SSL with Let's Encrypt

3. **Prisma Studio** (optional, secure access recommended):
   - Domain: `studio.momentum.yourdomain.com`
   - Forward port: `5555`
   - Add access control or keep internal only

### Updating

```bash
cd /opt/momentum
docker compose pull
docker compose up -d
```

Migrations run automatically on API container startup.

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
```

### Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U momentum momentum > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T postgres psql -U momentum momentum < backup_20260119.sql
```

---

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

### Docker Images

- `nespouique/momentum-web:latest` - Next.js frontend
- `nespouique/momentum-api:latest` - Express API with Prisma
