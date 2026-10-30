import {
  CATEGORIES,
  DISTRICTS,
  SORTS,
  type Category,
  type District,
  type PostFilters,
  type PostSort,
} from './api';

const asNumber = (value: string | null) => {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000_000 ? n : undefined;
};

/** Reads the board filters from the page address (?category=RENTALS&q=room...). Unknown values are ignored. */
export function parseFilters(params: URLSearchParams): PostFilters {
  const category = params.get('category') as Category | null;
  const district = params.get('district') as District | null;
  const sort = params.get('sort') as PostSort | null;
  const q = params.get('q')?.trim();
  return {
    q: q ? q.slice(0, 100) : undefined,
    category: category && CATEGORIES.includes(category) ? category : undefined,
    district: district && DISTRICTS.includes(district) ? district : undefined,
    minPrice: asNumber(params.get('minPrice')),
    maxPrice: asNumber(params.get('maxPrice')),
    sort: sort && SORTS.includes(sort) ? sort : 'newest',
  };
}

/** The opposite: only what differs from the default goes into the address. */
export function serializeFilters(filters: PostFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.district) params.set('district', filters.district);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  return params.toString();
}

/** How many filters (besides search and sort) are on. Shown on the phone "Filters · 2" button. */
export function activeFilterCount(filters: PostFilters): number {
  return [
    filters.category,
    filters.district,
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
  ].filter(Boolean).length;
}
