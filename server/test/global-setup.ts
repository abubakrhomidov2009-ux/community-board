import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { getTestDatabaseUrl } from './test-database';

/** Runs once before all end-to-end tests: creates the test database if needed and applies the migrations. */
export default async function globalSetup(): Promise<void> {
  const testUrl = getTestDatabaseUrl();

  const adminUrl = new URL(testUrl);
  const databaseName = adminUrl.pathname.replace(/^\//, '');
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const found = await admin.$queryRaw<
      { datname: string }[]
    >`SELECT datname FROM pg_database WHERE datname = ${databaseName}`;
    if (found.length === 0) {
      // The name comes from our own settings, never from a visitor.
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
  });
}
