/**
 * Email domains that count as a university email (feature 24).
 *
 * HOW TO EDIT: add the real domain of your university to this list, in lowercase, without "@".
 * Example: if student emails look like "name@tgu.tj", add 'tgu.tj'.
 * A subdomain is accepted automatically: 'university.tj' also accepts 'students.university.tj'.
 *
 * Instead of editing this file you can set ALLOWED_UNIVERSITY_DOMAINS in server/.env
 * (comma separated, for example: tgu.tj,ttu.tj). When it is set, it replaces this list.
 *
 * These are placeholders until the real university domains are known.
 */
export const DEFAULT_UNIVERSITY_DOMAINS = [
  'university.tj',
  'students.university.tj',
];

export function getUniversityDomains(fromEnv?: string): string[] {
  const configured = (fromEnv ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_UNIVERSITY_DOMAINS;
}

/** True when the email's domain (or its parent domain) is in the allowed list. */
export function isUniversityEmail(email: string, domains: string[]): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  return domains.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}
