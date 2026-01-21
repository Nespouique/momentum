# Momentum - Deployment & Infrastructure

## 1. Overview

This document covers the development workflow, deployment architecture, CI/CD pipeline, and infrastructure configuration for Momentum.

---

## 2. Development Workflow

### 2.1 Prerequisites

- Node.js 20 LTS
- npm 10+
- Docker & Docker Compose
- PostgreSQL 16 (or via Docker)

### 2.2 Initial Setup

```bash
# Clone repository
git clone https://github.com/user/momentum.git
cd momentum

# Install dependencies (all workspaces)
npm install

# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start PostgreSQL (if using Docker)
npm run db:start

# Run database migrations
npm run db:migrate -w @momentum/api

# Seed initial data (exercises, muscle groups)
npm run db:seed -w @momentum/api

# Start development servers
npm run dev
```

### 2.3 Environment Variables

**Root `.env`:**
```env
NODE_ENV=development
```

**`apps/api/.env`:**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://momentum:momentum@localhost:5432/momentum
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

**`apps/web/.env`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2.4 NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start both API and Web in dev mode |
| `dev:api` | `npm run dev:api` | Start API only |
| `dev:web` | `npm run dev:web` | Start Web only |
| `build` | `npm run build` | Build shared, then API, then Web |
| `lint` | `npm run lint` | Lint all workspaces |
| `format` | `npm run format` | Format code with Prettier |
| `db:start` | `npm run db:start` | Start PostgreSQL container |
| `db:stop` | `npm run db:stop` | Stop PostgreSQL container |
| `db:reset` | `npm run db:reset` | Reset database (delete volumes) |

### 2.5 Development Server Notes

**IMPORTANT: Do NOT start development servers automatically** when running Claude Code or other AI assistants. The developer runs servers in separate terminals to:

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

**Build Verification** (without restarting servers):
```bash
# Check types only (no emit)
npx tsc --noEmit -p apps/api
npx tsc --noEmit -p apps/web

# Or build with type checking
npm run build -w @momentum/shared
npm run build -w @momentum/api
npm run build -w @momentum/web
```

---

## 3. Production Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PROXMOX LXC                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   DOCKER ENVIRONMENT                       │  │
│  │                                                            │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐  │  │
│  │  │   Next.js   │    │   Express   │    │  PostgreSQL  │  │  │
│  │  │  Frontend   │───▶│   Backend   │───▶│   Database   │  │  │
│  │  │  (Port 3000)│    │  (Port 3001)│    │  (Port 5432) │  │  │
│  │  └─────────────┘    └─────────────┘    └──────────────┘  │  │
│  │         │                  │                              │  │
│  └─────────│──────────────────│──────────────────────────────┘  │
│            │                  │                                  │
│  ┌─────────▼──────────────────▼──────────────────────────────┐  │
│  │              NGINX PROXY MANAGER                           │  │
│  │         (Reverse Proxy + SSL/Let's Encrypt)                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      PORTAINER                              │  │
│  │                  (Container Management)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │     INTERNET    │
                    │   (HTTPS/443)   │
                    └─────────────────┘
```

---

## 4. Docker Configuration

### 4.1 API Dockerfile

```dockerfile
# docker/Dockerfile.api
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=@momentum/api --workspace=@momentum/shared

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN npm run build -w @momentum/shared
RUN npm run build -w @momentum/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
USER expressjs
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### 4.2 Web Dockerfile

```dockerfile
# docker/Dockerfile.web
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=@momentum/web --workspace=@momentum/shared

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @momentum/shared
RUN npm run build -w @momentum/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### 4.3 Docker Compose (Production)

```yaml
# docker/docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: momentum-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: momentum
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: momentum
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U momentum"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/user/momentum-api:latest
    container_name: momentum-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://momentum:${DB_PASSWORD}@postgres:5432/momentum
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://momentum.example.com
    expose:
      - "3001"

  web:
    image: ghcr.io/user/momentum-web:latest
    container_name: momentum-web
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: https://api.momentum.example.com/api
    expose:
      - "3000"

volumes:
  postgres_data:
```

### 4.4 Docker Compose (Development)

```yaml
# docker/docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: momentum-db-dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: momentum
      POSTGRES_PASSWORD: momentum
      POSTGRES_DB: momentum
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data

volumes:
  postgres_data_dev:
```

---

## 5. CI/CD Pipeline

### 5.1 CI Workflow (Pull Requests)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: momentum_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linters
        run: npm run lint

      - name: Type check
        run: npm run build

      - name: Run tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/momentum_test
          JWT_SECRET: test-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/api/coverage/lcov.info,./apps/web/coverage/lcov.info
```

### 5.2 Deploy Workflow (Main Branch)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.api
          push: true
          tags: ghcr.io/${{ github.repository }}-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.web
          push: true
          tags: ghcr.io/${{ github.repository }}-web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 6. Security & Performance

### 6.1 Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Authentication | JWT with bcrypt (12 rounds) for password hashing |
| Authorization | Single-user MVP, userId verified on all requests |
| Input Validation | Zod schemas on all endpoints |
| SQL Injection | Prisma ORM (parameterized queries) |
| XSS | React automatic escaping, Content-Security-Policy headers |
| CORS | Restrictive origin in production |
| Rate Limiting | express-rate-limit (100 req/min) |
| HTTPS | Nginx Proxy Manager + Let's Encrypt |
| Secrets | Environment variables, never in code |
| Headers | Helmet.js for security headers |

### 6.2 Performance Considerations

| Aspect | Strategy |
|--------|----------|
| Database | Index on userId + date for frequent queries |
| API Response | Pagination on lists (limit 50 default) |
| Caching | React Query staleTime (5min for static data) |
| Bundle Size | Next.js automatic code splitting |
| Images | next/image optimization |
| PWA | Service Worker for static assets |

---

## 7. Monitoring & Health Checks

### 7.1 MVP Implementation

- **Logging**: Structured JSON logs via `pino`
- **Health Checks**: `/health` endpoint for Docker/Portainer
- **Error Tracking**: Console logging (upgrade to Sentry in Phase 2)

### 7.2 Health Check Endpoint

```typescript
// GET /health
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});
```

---

## 8. Testing Strategy

### 8.1 Test Pyramid

```
         /\
        /E2E\        Playwright (Phase 2)
       /------\
      /  Integ  \    Supertest + Test DB
     /------------\
    / Unit Tests   \ Vitest
   /________________\
```

### 8.2 Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific workspace tests
npm run test -w @momentum/api
npm run test -w @momentum/web
```
