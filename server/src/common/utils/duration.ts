const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Converts values like "7d", "12h", "30m" to milliseconds. Falls back to `fallback` (default 7 days). */
export function parseDurationMs(
  value: string | undefined,
  fallback = 7 * UNIT_MS.d,
): number {
  const match = /^(\d+)([smhd])$/.exec(value ?? '');
  if (!match) return fallback;
  return Number(match[1]) * UNIT_MS[match[2]];
}
