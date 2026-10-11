# Architecture Documentation Index

This folder is the primary entry point for Momentum's sharded architecture documentation.

## Documentation Status

Reconciled on 2026-10-11 against both the original monolith, the existing split,
and repository sources. These documents are the active architecture reference.
Implemented behavior, known gaps, and proposed changes are distinguished;
documentation coverage is not an implementation-readiness verdict or live
production verification. Source code and [project rules](../../AGENTS.md) remain
the verification anchors as the application evolves.

The [original monolith](../archive/architecture-original.md) is retained only for
provenance and superseded examples. Its technical subjects are covered below;
obsolete code listings are replaced by current patterns and source references,
not copied as implementation instructions. Story 3.8 is implemented and marked done in the scoped
sprint status; user-reported acceptance is recorded in the canonical story. This does not assert
formal BMAD review or production deployment.

## Essential Files

Read these files as needed for development context:

| File                                         | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| [overview.md](./overview.md)                 | Scope, boundaries, decisions and rationale    |
| [coding-standards.md](./coding-standards.md) | Code conventions, ESLint, Prettier, naming    |
| [tech-stack.md](./tech-stack.md)             | Technologies, versions, scripts, dev workflow |
| [source-tree.md](./source-tree.md)           | Project structure, file organization          |

## Reference Files (Load on demand)

Load these files when working on specific areas:

| File                                                   | When to use                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [data-models.md](./data-models.md)                     | Working with database, Prisma schema, TypeScript interfaces                  |
| [api-spec.md](./api-spec.md)                           | Implementing or consuming API endpoints                                      |
| [deployment.md](./deployment.md)                       | Docker, CI/CD, infrastructure, environment variables                         |
| [components-workflows.md](./components-workflows.md)   | Frontend components, state management, business flows                        |
| [frontend-architecture.md](./frontend-architecture.md) | App Router, UI composition, persistence/hydration, fetch and proxy           |
| [backend-architecture.md](./backend-architecture.md)   | Express organization, ownership, transactions, JWT, Zod, errors, progression |

## Original Architecture Coverage

Every original top-level subject has an active destination. Domain documents
record replaced assumptions and current gaps; historical examples remain in the
archive for provenance, not as a second normative specification.

| Original section               | Active destination                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| 1. Introduction                | [Overview](./overview.md)                                                           |
| 2. High-Level Architecture     | [Overview](./overview.md)                                                           |
| 3. Tech Stack                  | [Tech stack](./tech-stack.md)                                                       |
| 4. Data Models                 | [Data models](./data-models.md)                                                     |
| 5. API Specification           | [API](./api-spec.md)                                                                |
| 6. Components                  | [Frontend](./frontend-architecture.md), [workflows](./components-workflows.md)      |
| 7. Core Workflows              | [Workflows](./components-workflows.md)                                              |
| 8. Database Schema             | [Data models and SQL constraints](./data-models.md)                                 |
| 9. Frontend Architecture       | [Frontend](./frontend-architecture.md)                                              |
| 10. Backend Architecture       | [Backend](./backend-architecture.md)                                                |
| 11. Project Structure          | [Source tree](./source-tree.md)                                                     |
| 12. Development Workflow       | [Tech stack](./tech-stack.md), [deployment and Hercules migration](./deployment.md) |
| 13. Deployment Architecture    | [Deployment](./deployment.md)                                                       |
| 14. Security & Performance     | [Deployment](./deployment.md), [coding standards](./coding-standards.md)            |
| 15. Testing Strategy           | [Verification and historical test plan](./deployment.md)                            |
| 16. Coding Standards           | [Coding standards](./coding-standards.md)                                           |
| 17. Monitoring & Observability | [Deployment](./deployment.md), [health contracts](./api-spec.md)                    |
| 18. Appendix                   | [Glossary](./data-models.md), [references](./tech-stack.md)                         |

## Quick Reference

### To understand the codebase structure

Read: `source-tree.md`

### To follow code conventions

Read: `coding-standards.md`

### To know what technologies we use

Read: `tech-stack.md`

### To work with database/models

Read: `data-models.md`

### To implement API endpoints

Read: `api-spec.md`

### To deploy or configure CI/CD

Read: `deployment.md`

### To understand UI components and workflows

Read: `components-workflows.md`
