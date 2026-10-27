const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Converts values like "7d", "12h", "30m" to milliseconds. Falls back to 7 days. */
export function parseDurationMs(value: string | undefined): number {
  const match = /^(\d+)([smhd])$/.exec(value ?? '');
  if (!match) return 7 * UNIT_MS.d;
  return Number(match[1]) * UNIT_MS[match[2]];
}
