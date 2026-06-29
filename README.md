# 🗺️ Voyagr Project

Welcome to the main repository for the Voyagr project! This repository uses a **Monorepo** architecture powered by [Turborepo](https://turborepo.dev/) and [pnpm](https://pnpm.io/).

## 🛠️ Tech Stack

- **Package Manager:** pnpm
- **Monorepo Orchestrator:** Turborepo
- **Frontend (`apps/mobile`):** React Native, Expo (SDK 55)
- **Backend (`apps/api`):** Node.js 24 (ESM), Fastify, tRPC, Zod
- **Database (`packages/database`):** PostgreSQL, Drizzle ORM, `postgres.js`
- **Code Quality:** ESLint (Flat Config), Prettier, Husky, Commitlint, lint-staged
- **Local Infrastructure:** Docker & Docker-Compose

---

## 🏗️ Project Architecture

The codebase is divided into two main areas: executable applications and shared packages.

```bash
voyagr/
├── apps/
│   ├── api/                # The backend server (Fastify + tRPC)
│   └── mobile/             # The React Native mobile application (Expo)
├── packages/
│   ├── database/           # Drizzle schema and PostgreSQL access
│   └── eslint-config/      # Shared ESLint Flat Config for the monorepo
├── docker-compose.yml      # Local infrastructure
├── turbo.json              # Turborepo scripts configuration
└── pnpm-workspace.yaml     # Monorepo configuration
```

## 🚀 Installation Guide (Onboarding)

### 1. Prerequisites

Ensure you have the following tools installed on your machine:

- [Node.js](https://nodejs.org/) (Version 24 LTS)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker-Compose)
- **Expo Go** app installed on your mobile device (iOS/Android) or a local emulator/simulator.

### 2. Install Dependencies

At the root of the project, install all packages:
_(Note: This will automatically set up Husky Git Hooks for your local development environment)_

```bash
pnpm install
```

### 3. Environment Variables

The project uses Zod for strict environment validation. You need to create two `.env` files.

Create `apps/api/.env`:

```env
DATABASE_URL=postgres://admin:password@db:5432/voyagr
PORT=3000
NODE_ENV=development
```

Create `packages/database/.env`:

```env
DATABASE_URL=postgres://admin:password@localhost:5432/voyagr
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

> ℹ️ Note on `data.json`: The discovery content seed (`discovery.seed.ts`) imports extra locations from `packages/database/data.json` if the file is present. This file is gitignored (large scraped dataset) — without it, the seed simply skips this step and only inserts the test data.

### 6. Run the API

Start the FastAPI server:

```bash
pnpm turbo run dev --filter=api
```

✅ The backend API should be accessible at `http://localhost:3000/trpc/getInspirations`

Start the Mobile App (Expo):

```bash
pnpm turbo run start --filter=@voyagr/mobile
```

✅ Scan the QR code in your terminal with the Expo Go app on your phone or press `i` for iOS simulator.

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

| Action                          | Command                                        |
| ------------------------------- | ---------------------------------------------- |
| **Start the API**               | `pnpm turbo run dev --filter=api`              |
| **Start the Mobile App**        | `pnpm turbo run start --filter=@voyagr/mobile` |
| **Format the entire project**   | `pnpm run format`                              |
| **Lint the entire project**     | `pnpm run lint`                                |
| **Update local DB**             | `pnpm --filter @voyagr/database db:push`       |
| **Generate migration (Prod)**   | `pnpm --filter @voyagr/database db:generate`   |
| **Start Docker (Backend + DB)** | `docker-compose up -d`                         |
| **Stop Docker**                 | `docker-compose down`                          |

> ⚠️ Note on Drizzle: Locally, during rapid development, use `db:push`. For structural updates intended for production, use `db:generate` to create `.sql` migration files.
