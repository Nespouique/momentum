# Momentum

A fitness tracking application built with Next.js and Express.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Shared**: TypeScript types shared between frontend and backend

## Project Structure

```
momentum/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Express.js backend (port 3001)
├── packages/
│   └── shared/       # Shared TypeScript types
├── package.json      # Workspaces root
└── tsconfig.base.json
```

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend at http://localhost:3000
   - Backend at http://localhost:3001

## Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Development

### Adding shared types

Add types to `packages/shared/src/types/index.ts` and import them in your apps:

```typescript
import type { User } from "@momentum/shared";
```
