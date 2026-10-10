# Voyagr — mobile

Expo (SDK 57) + Expo Router app. Same journey and design as `apps/web`, rebuilt for native.

## Run

```bash
cp .env.example .env   # then set EXPO_PUBLIC_API_URL (see comments in the file)
pnpm --filter @voyagr/mobile start
```

| Script      | What it does                                   |
| ----------- | ---------------------------------------------- |
| `start`     | Expo dev server (Expo Go, emulator, simulator) |
| `typecheck` | `tsc --noEmit`                                 |
| `lint`      | ESLint (shared config + React Hooks rules)     |
| `test`      | Jest (`jest-expo`) — unit tests of pure logic  |

## Where things go

```
src/
  app/            Routes only (expo-router). Thin screens: compose components, call one feature hook.
  features/<x>/   One folder per feature (onboarding, discovery, trip, …)
    components/   UI specific to the feature, one component per file
    hooks/        useXxx: tRPC calls + state orchestration
    lib/          Pure functions (business rules), each with a *.test.ts
  ui/             Design-system primitives (Text, Button, Card, Chip, Sheet, states…), written
                  in-house on NativeWind: no third-party UI kit
  hooks/          Generic hooks reused across features (useHardwareBack…)
  theme/tokens.ts Colours, radii, shadows — the only place a colour value may appear
  lib/            tRPC client, env, storage, guest id
```

## Rules

1. No business logic in `app/` screens or in components: put it in `features/*/lib`, with a test.
2. No hard-coded colours: use token classes (`bg-primary`, `text-ink-muted`, `rounded-card`) or `theme/tokens`.
3. API types come from `RouterOutputs` / `RouterInputs` (`@/lib/trpc`), never from relative imports into `apps/api`.
4. Every query renders its loading, error (with retry) and empty states using `@/ui`.
5. UI copy is French and uses "tu".
6. Follow the charte (DA V1, Sept. 2026): one corallo (`primary`) button per screen, no shadows,
   no emojis in the UI, icons from `@/ui/icons` (Phosphor), serif for titles, sans for actions.
