# Prompt

J'ai trouvé cette page de la documentation BetterAuth : https://better-auth.com/docs/adapters/drizzle.
Voici ce qui est dit :

## Installation

To use the Drizzle adapter, you need to install the `@better-auth/drizzle-adapter` package:

```package-install
@better-auth/drizzle-adapter
```

## Example Usage

You can use the Drizzle adapter to connect to your database as follows.

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from './database.ts';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    // [!code highlight]
    provider: 'sqlite', // or "pg" or "mysql" // [!code highlight]
  }), // [!code highlight]
  //... the rest of your config
});
```

## Schema generation & migration

The [Better Auth CLI](/docs/concepts/cli) allows you to generate or migrate
your database schema based on your Better Auth configuration and plugins.

To generate the schema required by Better Auth, run the following command:

```package-install
npx auth@latest generate
```

To generate and apply the migration, run the following commands:

<Tabs items={["generate", "migrate"]}>
<Tab value="generate">
`package-install
    npx drizzle-kit generate # generate the migration file
    `
</Tab>

  <Tab value="migrate">
    ```package-install
    npx drizzle-kit migrate # apply the migration
    ```
  </Tab>
</Tabs>
