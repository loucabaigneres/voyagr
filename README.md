# 🗺️ Voyagr Project

Welcome to the main repository for the Voyagr project! This repository uses a **Monorepo** architecture powered by [Turborepo](https://turborepo.dev/) and [pnpm](https://pnpm.io/).

## 🛠️ Tech Stack

- **Package Manager:** pnpm
- **Monorepo Orchestrator:** Turborepo
- **Frontend (`apps/web`):** React (Vite), TypeScript, TanStack Router, Tailwind CSS, Motion (`motion/react`), tRPC Client
- **Backend (`apps/api`):** Node.js 24 (ESM), Fastify, tRPC, Zod, Better Auth
- **Database (`packages/database`):** PostgreSQL, Drizzle ORM, `postgres.js`
- **Code Quality:** ESLint v10 (Flat Config), Prettier, Husky, Commitlint, lint-staged
- **Local Infrastructure:** Docker & Docker-Compose

---

## 🏗️ Project Architecture

The codebase is divided into executable applications and shared packages.

```bash
voyagr/
├── apps/
│   ├── api/              # The backend server (Fastify + tRPC + Better Auth)
│   └── web/              # The frontend web application (Vite + React)
├── packages/
│   ├── database/         # Drizzle schema, DB instance, and migrations
│   └── eslint-config/     # Shared ESLint Flat Config for the monorepo
├── docker-compose.yml    # Local infrastructure (PostgreSQL + API)
├── turbo.json            # Turborepo scripts configuration
└── pnpm-workspace.yaml   # Monorepo configuration
```

## 🚀 Installation Guide (Onboarding)

### 1. Prerequisites

Ensure you have the following tools installed on your machine:

- [Node.js](https://nodejs.org/) (Version 24 LTS)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker-Compose)

### 2. Install Dependencies

At the root of the project, install all packages:
_(Note: This will automatically set up Husky Git Hooks for your local development environment)_

```bash
pnpm install
```

### 3. Environment Variables

The project uses Zod for strict environment validation. You need to create three `.env` files.

Create `apps/api/.env`:

```env
DATABASE_URL=postgres://admin:password@db:5432/voyagr
PORT=3000
NODE_ENV=development
BETTER_AUTH_SECRET=generate_a_random_string_here
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=found_in_your_google_cloud_console
GOOGLE_CLIENT_SECRET=found_in_your_google_cloud_console
FRONTEND_URL=http://localhost:5173
```

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Create `packages/database/.env`:

```env
DATABASE_URL=postgres://admin:password@localhost:5432/voyagr
```

### 4. Start the Backend Infrastructure (Docker)

Start both the PostgreSQL database and the Fastify API in the background:

```bash
docker-compose up -d
```

✅ The Backend API is now automatically running on `http://localhost:3000`

### 5. Initialize and Seed the Database

We use strict migration flows. First, generate the SQL migration files, apply them to the database, and finally inject the test data:

```bash
pnpm --filter @voyagr/database db:generate
pnpm --filter @voyagr/database db:migrate
pnpm --filter @voyagr/database db:seed
```

> ℹ️ Note on `data.json`: The discovery content seed (`discovery.seed.ts`) imports extra locations from `packages/database/data.json` if the file is present. This file is gitignored (large scraped dataset) — without it, the seed simply skips this step and only inserts the test data.

### 6. Run the Web Frontend

Since the backend is already running via Docker, you only need to start the Vite frontend locally:

```bash
pnpm turbo run dev --filter=@voyagr/web
```

✅ The Web App will be accessible at `http://localhost:5173`

---

## 🛡️ Code Quality & Git Workflow

To maintain a high-quality codebase, we enforce formatting and commit conventions automatically using **Husky** and **lint-staged**.

### 1. Auto-formatting on Commit

When you run `git commit`, Husky intercepts the action and runs `lint-staged`. It will automatically run ESLint and Prettier **only on the files you modified**. If there are auto-fixable errors, it will fix them and add them to your commit seamlessly.

### 2. Conventional Commits

We use `commitlint`. Your commit messages must follow the Conventional Commits format, or the commit will be rejected.

Format: `<type>(<optional scope>): <description>`

**Allowed types:**

- `feat:` A new feature

- `fix:` A bug fix

- `docs:` Documentation only changes

- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc)

- `refactor:` A code change that neither fixes a bug nor adds a feature

- `chore:` Changes to the build process or auxiliary tools

_Example:_ `git commit -m "feat: add user authentication via BetterAuth"`

---

## 📝 Useful Commands

Thanks to Turborepo, you can run commands from the root to target specific projects.

| Action                        | Command                                      |
| ----------------------------- | -------------------------------------------- |
| **Start the API**             | `pnpm turbo run dev --filter=@voyagr/api`    |
| **Start the Web App**         | `pnpm turbo run dev --filter=@voyagr/web`    |
| **Format the entire project** | `pnpm run format`                            |
| **Lint the entire project**   | `pnpm run lint`                              |
| **Generate DB migration**     | `pnpm --filter @voyagr/database db:generate` |
| **Apply DB migration**        | `pnpm --filter @voyagr/database db:migrate`  |
| **Start Docker (DB + API)**   | `docker-compose up -d`                       |
| **Stop Docker**               | `docker-compose down`                        |
