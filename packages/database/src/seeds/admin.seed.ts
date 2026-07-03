import { randomBytes, scrypt } from 'crypto';
import { user, account } from '../schemas/auth.js';

export const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_EMAIL = 'admin@voyagr.app';
const ADMIN_PASSWORD = 'Admin1234!';
const ADMIN_NAME = 'Admin Voyagr';

/**
 * Mirrors exactly @better-auth/utils/password (password.node.mjs):
 * - salt is kept as a hex STRING (not a Buffer) when passed to scrypt
 * - password is NFKC-normalised before hashing
 * - maxmem matches better-auth's formula: 128 * N * r * 2
 */
function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) reject(err);
        else resolve(`${salt}:${(key as Buffer).toString('hex')}`);
      },
    );
  });
}

export async function seedAdmin(db: ReturnType<typeof import('../index.js').createClient>) {
  const now = new Date();
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  // Upsert so re-seeding always ensures the admin user is correct.
  await db
    .insert(user)
    .values({
      id: ADMIN_USER_ID,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      emailVerified: true,
      role: 'admin',
      banned: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: user.id,
      set: { role: 'admin', updatedAt: now },
    });

  // Upsert the credential account — always refreshes the password hash so
  // re-seeding after a failed first attempt works correctly.
  await db
    .insert(account)
    .values({
      id: `${ADMIN_USER_ID}-credential`,
      userId: ADMIN_USER_ID,
      accountId: ADMIN_USER_ID,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: account.id,
      set: { password: hashedPassword, updatedAt: now },
    });

  console.warn(`  ✓ Admin seeded — email: ${ADMIN_EMAIL} / password: ${ADMIN_PASSWORD}`);
}
