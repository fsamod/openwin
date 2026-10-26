import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = path.join(projectRoot, 'src', 'locales');
const english = JSON.parse(readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const german = JSON.parse(readFileSync(path.join(localesDir, 'de.json'), 'utf8'));

const locales = { en: english, de: german };

function placeholders(value) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test('every locale covers the English key set exactly', () => {
  for (const key of Object.keys(english)) {
    assert.equal(typeof english[key], 'string', `${key} maps to a string`);
    assert.ok(english[key].trim().length > 0, `${key} is not empty`);
  }

  for (const key of Object.keys(german)) {
    assert.ok(key in english, `de has key not present in en: ${key}`);
  }

  for (const key of Object.keys(english)) {
    assert.ok(key in german, `de is missing key: ${key}`);
    assert.ok(german[key].trim().length > 0, `de key is empty: ${key}`);
  }
});

test('translated values keep the same placeholders as English', () => {
  for (const key of Object.keys(english)) {
    assert.deepEqual(placeholders(german[key]), placeholders(english[key]), `placeholder mismatch: ${key}`);
  }
});

test('plural forms exist for count.app in every locale', () => {
  for (const [code, strings] of Object.entries(locales)) {
    assert.ok(strings['count.app.one'], `${code} misses count.app.one`);
    assert.ok(strings['count.app.other'], `${code} misses count.app.other`);
  }
});
