import { activeFilterCount, parseFilters, serializeFilters } from './filters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe('board filters in the page address', () => {
  it('starts with newest first and nothing else', () => {
    expect(parse('')).toEqual({ sort: 'newest' });
  });

  it('reads every filter', () => {
    expect(
      parse('q=room&category=RENTALS&district=SINO&minPrice=100&maxPrice=900&sort=price_asc'),
    ).toEqual({
      q: 'room',
      category: 'RENTALS',
      district: 'SINO',
      minPrice: 100,
      maxPrice: 900,
      sort: 'price_asc',
    });
  });

  it('ignores values the backend would refuse', () => {
    expect(parse('category=CARS&district=MARS&minPrice=-5&maxPrice=abc&sort=cheapest')).toEqual({
      sort: 'newest',
    });
  });

  it('writes only what differs from the default, and reads it back the same', () => {
    const filters = parse('q=room&category=RENTALS&maxPrice=900&sort=oldest');
    expect(serializeFilters(filters)).toBe('q=room&category=RENTALS&maxPrice=900&sort=oldest');
    expect(serializeFilters({ sort: 'newest' })).toBe('');
    expect(parse(serializeFilters(filters))).toEqual(filters);
  });

  it('counts category, district and price as filters (not search or sort)', () => {
    expect(activeFilterCount(parse('q=a&sort=oldest'))).toBe(0);
    expect(activeFilterCount(parse('category=RENTALS&district=SINO&minPrice=5&maxPrice=9'))).toBe(
      3,
    );
  });
});
