import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * The end-to-end tests use their own database, never the one with your demo data.
 * Default: the same server and user as DATABASE_URL, database name + "_test"
 * (community_board becomes community_board_test). Override with E2E_DATABASE_URL (for example in CI).
 */
export function getTestDatabaseUrl(): string {
  config({ path: resolve(__dirname, '../.env'), quiet: true });
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;

  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      'DATABASE_URL is missing (server/.env), so the test database cannot be found',
    );
  }
  const url = new URL(base);
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    url.pathname = `/${name}_test`;
  }
  return url.toString();
}
