import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 10;

export type SuperAdminResult = 'created' | 'upgraded' | 'unchanged';

/**
 * Makes the account with this email the one and only super admin.
 * - Any other super admin is turned into a normal admin (there is exactly one).
 * - An existing account with the email is upgraded (and unblocked); otherwise it is created.
 * - The password is only (re)set when `resetPassword` is true (the seed does that; server start does not).
 * Shared by the seed and by the server start-up, so a fresh database (Neon) gets its super admin without a shell.
 */
export async function ensureSuperAdmin(
  prisma: PrismaClient,
  input: { email: string; password: string; resetPassword: boolean },
): Promise<SuperAdminResult> {
  const email = input.email.trim().toLowerCase();

  await prisma.user.updateMany({
    where: { role: Role.SUPER_ADMIN, email: { not: email } },
    data: { role: Role.ADMIN },
  });

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isBlocked: true },
  });

  if (existing) {
    const passwordHash = input.resetPassword
      ? await bcrypt.hash(input.password, BCRYPT_COST)
      : undefined;
    if (
      existing.role === Role.SUPER_ADMIN &&
      !existing.isBlocked &&
      !passwordHash
    ) {
      return 'unchanged';
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: Role.SUPER_ADMIN, isBlocked: false, passwordHash },
    });
    return 'upgraded';
  }

  await prisma.user.create({
    data: {
      email,
      username: await freeUsername(prisma),
      passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
      role: Role.SUPER_ADMIN,
    },
  });
  return 'created';
}

async function freeUsername(prisma: PrismaClient): Promise<string> {
  for (let n = 0; n < 50; n++) {
    const username = n === 0 ? 'superadmin' : `superadmin${n}`;
    const taken = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!taken) return username;
  }
  throw new Error('Could not find a free username for the super admin');
}
