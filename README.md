# 🗺️ Voyagr Project

Welcome to the main repository for the Voyagr project! This repository uses a **Monorepo** architecture powered by [Turborepo](https://turborepo.dev/) and [pnpm](https://pnpm.io/).

## 🛠️ Tech Stack

- **Package Manager:** pnpm
- **Monorepo Orchestrator:** Turborepo
- **Backend (`apps/api`):** Node.js 24 (ESM), Fastify, tRPC, Zod
- **Database (`packages/database`):** PostgreSQL, Drizzle ORM, `postgres.js`
- **Local Infrastructure:** Docker & Docker-Compose

---

## 🏗️ Project Architecture

The codebase is divided into two main areas: executable applications and shared packages.

```bash
voyagr/
├── apps/
│   └── api/                # The backend server (Fastify + tRPC)
├── packages/
│   └── database/           # Drizzle schema and PostgreSQL access
├── docker-compose.yml      # Local infrastructure (PostgreSQL)
├── turbo.json              # Turborepo scripts configuration
└── pnpm-workspace.yaml     # Monorepo configuration
```

## 🚀 Installation Guide (Onboarding)

### 1. Prerequisites

Ensure you have the following tools installed on your machine:

- [Node.js](https://nodejs.org/) (Version 24 LTS)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker-Compose)

### 2. Install Dependencies

At the root of the project, install all packages:

```bash
pnpm install
```

### 3. Environment Variables

The project uses Zod for strict environment validation. You need to create two `.env` files.

Create `apps/api/.env`:

```env
DATABASE_URL=postgres://admin:password@db:5432/voyagr_dev
PORT=3000
NODE_ENV=development
```

Create `packages/database/.env`:

```env
DATABASE_URL=postgres://admin:password@db:5432/voyagr_dev
```

### 4. Start the Database (Docker)

Start the PostgreSQL container in the background:

```bash
docker-compose up -d
```

### 5. Initialize and Seed the Database

Push the Drizzle schema to PostgreSQL and inject the test data:

```bash
pnpm --filter @voyagr/database db:push
pnpm --filter @voyagr/database db:seed
```

### 6. Run the API

Start the Fastify server:

```bash
pnpm turbo run dev --filter=api
```

✅ The server should be accessible at `http://localhost:3000/trpc/getInspirations`

---

## 📝 Useful Commands

Thanks to Turborepo, you can run commands from the root to target specific projects.

| Action                        | Command                                      |
| ----------------------------- | -------------------------------------------- |
| **Start the API**             | `pnpm turbo run dev --filter=api`            |
| **Update local DB**           | `pnpm --filter @voyagr/database db:push`     |
| **Generate migration (Prod)** | `pnpm --filter @voyagr/database db:generate` |
| **Stop Docker**               | `docker-compose down`                        |

> ⚠️ Note on Drizzle: Locally, during rapid development, use `db:push`. For structural updates intended for production, use `db:generate` to create `.sql` migration files.
