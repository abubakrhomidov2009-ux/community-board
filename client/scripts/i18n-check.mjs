// Checks that messages/en.json, ru.json and tg.json have exactly the same keys and the same {placeholders}.
// Run: npm run i18n:check   (exit code 1 when something is missing)
import { readFileSync } from 'node:fs';

const LOCALES = ['en', 'ru', 'tg'];

function flatten(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]],
  );
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
const tags = (text) => [...text.matchAll(/<(\w+)>/g)].map((match) => match[1]).sort().join(',');

const messages = Object.fromEntries(
  LOCALES.map((locale) => [locale, new Map(flatten(JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))))]),
);

const problems = [];
const reference = messages.en;
for (const locale of LOCALES.filter((l) => l !== 'en')) {
  for (const [key, text] of reference) {
    const other = messages[locale].get(key);
    if (other === undefined) problems.push(`${locale}: missing key ${key}`);
    else {
      if (other.trim() === '') problems.push(`${locale}: empty text for ${key}`);
      if (placeholders(text) !== placeholders(other)) problems.push(`${locale}: {placeholders} differ in ${key}`);
      if (tags(text) !== tags(other)) problems.push(`${locale}: <tags> differ in ${key}`);
    }
  }
  for (const key of messages[locale].keys()) {
    if (!reference.has(key)) problems.push(`${locale}: extra key ${key} (not in en)`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} translation problem(s).`);
  process.exit(1);
}
console.log(`Translations OK: ${reference.size} keys in ${LOCALES.join(', ')}.`);
