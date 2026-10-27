export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Builds the shared pagination envelope used by every list endpoint. */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Prisma skip/take for a 1-based page. */
export function pageArgs(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}
