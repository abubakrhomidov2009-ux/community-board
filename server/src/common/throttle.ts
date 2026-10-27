const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Limits per IP address. Used with @Throttle(THROTTLE.login) on the sensitive endpoints. */
export const GLOBAL_LIMIT = { ttl: MINUTE, limit: 100 };

export const THROTTLE = {
  login: { default: { limit: 5, ttl: MINUTE } },
  register: { default: { limit: 5, ttl: MINUTE } },
  createPost: { default: { limit: 10, ttl: HOUR } },
  createComment: { default: { limit: 20, ttl: 10 * MINUTE } },
  report: { default: { limit: 10, ttl: HOUR } },
  message: { default: { limit: 30, ttl: MINUTE } },
  universityEmail: { default: { limit: 3, ttl: HOUR } },
};
