import { createHash } from 'node:crypto';

/** Only a hash of a secret token is stored, so a copy of the database cannot be used to log in or verify emails. */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
