import { safeNextPath } from './safe-path';

describe('safeNextPath', () => {
  const home = '/en/posts';

  it('keeps a path inside this site (with its language, query and #hash)', () => {
    expect(safeNextPath('/en/posts/abc', home)).toBe('/en/posts/abc');
    expect(safeNextPath('/ru/posts?x=1', home)).toBe('/ru/posts?x=1');
    expect(safeNextPath('/tg/about#rules', home)).toBe('/tg/about#rules');
  });

  it('falls back for nothing, other websites and tricks', () => {
    for (const bad of [
      null,
      undefined,
      '',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      '/fr/posts',
      '/posts',
    ]) {
      expect(safeNextPath(bad, home)).toBe(home);
    }
  });
});
