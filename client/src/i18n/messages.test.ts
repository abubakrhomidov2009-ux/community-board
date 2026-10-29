import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import tg from '../../messages/tg.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') result.set(`${prefix}${key}`, value);
    else for (const [k, v] of flatten(value, `${prefix}${key}.`)) result.set(k, v);
  }
  return result;
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[0]).sort();

describe('translations (same checks as npm run i18n:check)', () => {
  const english = flatten(en as Tree);

  it.each([
    ['ru', ru],
    ['tg', tg],
  ])(
    '%s has exactly the keys of en, none empty, with the same {placeholders} and <tags>',
    (_name, messages) => {
      const other = flatten(messages as Tree);
      expect([...other.keys()].sort()).toEqual([...english.keys()].sort());
      for (const [key, text] of english) {
        expect(other.get(key)?.trim()).toBeTruthy();
        expect(placeholders(other.get(key) ?? '')).toEqual(placeholders(text));
      }
    },
  );

  it('has a translated text for every error code the login screens can show', () => {
    for (const code of [
      'INVALID_CREDENTIALS',
      'USER_BLOCKED',
      'EMAIL_TAKEN',
      'USERNAME_TAKEN',
      'TOO_MANY_REQUESTS',
      'NETWORK_ERROR',
      'UNKNOWN',
    ]) {
      expect(english.has(`errors.${code}`)).toBe(true);
    }
  });
});
