# Momentum

A full-featured fitness tracking application for managing workouts, tracking body measurements, and recording active workout sessions with real-time performance comparison.

## Features

- **Exercise Library**: Shared exercise database with muscle group categorization
- **Workout Builder**: Create workout templates with supersets and customizable sets
- **Active Sessions**: Real-time workout tracking with timer, rest periods, set logging, extra sets and exercise reordering/replacement
- **Ad-hoc Sessions**: Start a free "À la volée" session without a workout and chain exercises as you go
- **Historical Comparison**: Compare current performance with previous sessions, with session history and exercise statistics (volume, estimated 1RM, charts)
- **Progressive Overload**: Automatic detection of stagnation and smart progression suggestions
- **AI Coach**: Personalized training advice powered by OpenAI to break through plateaus
- **Daily Tracking**: Configurable daily habits (yoga, steps, sleep, custom trackables) with goals, and a home dashboard you can navigate day by day
- **Health Sync**: Companion Android app (`momentum-companion`) syncing Health Connect data (steps, active minutes, calories, sleep, activities) to the API
- **Body Measurements**: Track and visualize body measurements over time
- **MCP Server**: Let ChatGPT, Claude, Claude Code, OpenCode or any MCP agent read your stats in natural language (read-only, optional)
- **Hercules Import**: CLI scripts (`scripts/hercules-*`) to migrate exercises, workouts, history and measurements from the Hercules app
- **Personalization**: Per-user accent color, installable PWA, French UI, dark theme

## MCP Server (optional)

Momentum embeds a **read-only [MCP](https://modelcontextprotocol.io) server** so an LLM or agent can answer
questions about your training in natural language ("how many sessions this month?", "what are my favorite
exercises?", "how did my bench press progress this year?") and generate summaries or dashboards. It runs
inside the API and is **disabled until `MCP_PUBLIC_URL` is set** in production.

### Connecting a client

| Client | Authentication |
|--------|----------------|
| ChatGPT (web/desktop), Claude (web/desktop) | Add a custom MCP connector with `https://<mcp-host>/mcp`, then sign in with your Momentum email and password (OAuth 2.1 + PKCE). The password is only entered on Momentum's own page. |
| Claude Code, OpenCode, scripts, agents | Create a **personal token** in *Settings > Connexions MCP* and send it as `Authorization: Bearer <token>` (expiry 30 days / 90 days / 1 year / never). |

Access is limited to the connected user's own data and can be revoked at any time from *Settings > Connexions MCP*.
See [docs/features/mcp-server.md](docs/features/mcp-server.md) for client setup, deployment and security details.
An icon for connector screens is available in `apps/web/public/momentum-mcp-icon.png` (also `-square` and `.svg` variants).

### What the MCP exposes

Everything is **read-only**. Each result is returned with its period, units and metric definitions, and set
results always come with their **targets** (planned reps/weight, sets that met the target, volume vs target).

| Data | Tools | Examples |
|------|-------|----------|
| Training summary | `get_stats_summary`, `get_activity_timeseries` | Sessions, active days, sets, reps, volume, duration, comparison with the previous period, series by day/week/month |
| Sessions | `list_sessions`, `get_session` | History with filters (period, status, planned/ad-hoc, exercise, workout), detail of every set (target vs actual, RPE, notes) |
| Exercises | `search_exercises`, `get_exercise_history`, `get_favorite_exercises`, `get_personal_records` | Progression per session, favorite exercises, max weight, estimated 1RM, max reps, best session volume |
| Muscle groups | `get_muscle_group_breakdown` | Sets, reps and volume per muscle group |
| Workout programs | `list_workouts` | Programs, their exercises and targets, completed sessions, last performed |
| Body measurements | `get_body_measurements` | Weight and measurements over time, evolution |
| Daily tracking | `get_daily_tracking` | Habits, steps, sleep and custom trackables with goals, days logged and goals met |
| Profile | `get_profile` | Name, age, height, goal, latest weight, number of sessions |

Two prompts are also provided: `synthese_mensuelle` (monthly review) and `dashboard_performances`
(3-month dashboard).

**Not exposed:** email, password and any authentication data, other users' data, health sync raw activities,
and every write operation (no session, workout or measurement can be created or modified through the MCP).
The results of the tools are sent to the provider of the LLM you connect, so only connect clients you trust.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn UI, Zustand
- **Backend**: Express.js 4 with TypeScript, Prisma ORM 7, Zod, MCP SDK
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
├── scripts/          # Hercules import scripts, docs/progress generators
├── docs/             # PRD, stories, architecture, feature guides
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
- `npm run docs:progress` - Regenerate the project progress dashboard (`docs/progress.html`)

### Tests
- `npm run test -w @momentum/api` - API unit tests; the MCP integration tests also run when `DATABASE_URL` points to a migrated, disposable database
- `npm run test -w @momentum/web` - Web unit tests

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
| `JWT_SECRET` | Secret key for JWT tokens | (required) |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `RESEND_API_KEY` | Resend API key for password reset emails (the API refuses to start without a non-empty value) | (required) |
| `RESEND_FROM_EMAIL` | Sender address for emails | `noreply@hallais.bzh` |
| `OPENAI_API_KEY` | OpenAI API key for the AI Coach and trackable icon suggestions. The variable must be defined at startup; AI features fail without a real key | (required to be defined) |
| `MCP_PUBLIC_URL` | Public origin serving `/mcp`, `/oauth/*` and `/.well-known/oauth-*` (e.g. `https://momentum-mcp.yourdomain.com`). Enables the MCP server; in production it stays disabled when empty | `http://localhost:3001` in development |
| `TRUST_PROXY` | Number of reverse proxies in front of the API (client IP for rate limits) | `1` in production |
| `MCP_DEFAULT_TIMEZONE` | Timezone used by MCP tools to delimit days and periods | `Europe/Paris` |

## Documentation

- [docs/prd.md](docs/prd.md) - Product requirements and epics
- [docs/stories/](docs/stories/) - Story specifications and implementation records
- [docs/architecture/](docs/architecture/index.md) - Architecture (API spec, data models, deployment)
- [docs/features/mcp-server.md](docs/features/mcp-server.md) - MCP server guide
- [docs/progress.html](docs/progress.html) - Project progress dashboard

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
│  momentum.domain.com   api.momentum.domain.com   mcp.domain.com │
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
         - MCP_PUBLIC_URL=https://momentum-mcp.yourdomain.com  # optional, enables the MCP server
         - NODE_ENV=production
         - RESEND_API_KEY=YOUR_RESEND_API_KEY
         - OPENAI_API_KEY=YOUR_OPENAI_API_KEY
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
   - `YOUR_RESEND_API_KEY` / `YOUR_OPENAI_API_KEY`: API keys (both clients are created at API startup)

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

3. **MCP server** (optional, required to use the MCP):
   - Domain: the host set in `MCP_PUBLIC_URL`, e.g. `momentum-mcp.yourdomain.com`
   - Forward hostname/IP: server IP, forward port: `3001` (the API)
   - Enable SSL with Let's Encrypt and Force SSL
   - Disable "Block Common Exploits": it blocks OAuth requests whose query string contains URLs
   - Recommended: only publish `/mcp`, `/oauth/` and `/.well-known/oauth-` (see [docs/features/mcp-server.md](docs/features/mcp-server.md))

4. **Prisma Studio** (optional, secure access recommended):
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

1. **On every PR to main**: Runs lint and build checks
2. **On tag push (`v*`)**: Runs lint/build, then builds and pushes Docker images to DockerHub

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your DockerHub username |
| `DOCKERHUB_TOKEN` | DockerHub access token |

### Image Tags

Images are only built and pushed when a `v*` tag is pushed:

- `latest`: Most recent tagged release
- `<short-sha>`: Specific commit of that release (e.g., `abc1234`)

## Release Process

We keep a dedicated release commit so the version shown in the Profile page stays in sync.

1. Bump `package.json` to the new version (e.g., `0.1.10`).
2. Run lint: `npm run lint`.
3. Commit the bump with the exact message `release: vX.Y.Z`.
4. Tag that commit: `git tag vX.Y.Z`.
5. Push `main` and the tag: `git push origin main && git push origin vX.Y.Z`.
6. Create the GitHub Release:
  - `gh release create vX.Y.Z --title vX.Y.Z --generate-notes`

Pushing the `v*` tag triggers the Docker image build/push workflow.

### Docker Images

- `nespouique/momentum-web:latest` - Next.js frontend
- `nespouique/momentum-api:latest` - Express API with Prisma
