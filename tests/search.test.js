import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchText, matchesQuery, normalize, tokenize } from '../src/search.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(
  readFileSync(path.join(projectRoot, 'src', 'data', 'apps.json'), 'utf8')
);
const categoryNames = new Map(catalog.categories.map((category) => [category.id, category.name]));
const records = catalog.apps.map((app) => ({
  app,
  searchText: buildSearchText(app, categoryNames.get(app.category))
}));

function matchingIds(query) {
  const tokens = tokenize(query);
  return records
    .filter((record) => matchesQuery(record.searchText, tokens))
    .map((record) => record.app.id);
}

test('normalize lowercases text and removes diacritics', () => {
  assert.equal(normalize('Müller'), 'muller');
  assert.equal(normalize('  C++ Builder  '), '  c++ builder  ');
  assert.equal(normalize(null), '');
  assert.equal(normalize(undefined), '');
});

test('tokenize splits on whitespace and drops empty tokens', () => {
  assert.deepEqual(tokenize('  Brave   Browser  '), ['brave', 'browser']);
  assert.deepEqual(tokenize(''), []);
  assert.deepEqual(tokenize('   '), []);
});

test('buildSearchText includes name, publisher, package ID, description, and category', () => {
  const text = buildSearchText(
    {
      id: 'Example.App',
      name: 'Example',
      publisher: 'Example Corp',
      description: 'A small example application.',
      source: 'winget'
    },
    'Utilities'
  );

  for (const value of ['example', 'example corp', 'example.app', 'small example', 'utilities', 'winget']) {
    assert.ok(text.includes(value), `search text includes ${value}`);
  }
});

test('buildSearchText labels Store packages and beta entries', () => {
  const text = buildSearchText(
    {
      id: '9EXAMPLE',
      name: 'Example Store App',
      publisher: 'Example',
      description: 'Example.',
      source: 'msstore',
      preview: true
    },
    'Utilities'
  );

  assert.ok(text.includes('microsoft store'));
  assert.ok(text.includes('msstore'));
  assert.ok(text.includes('beta preview'));
});

test('matchesQuery requires every token to match', () => {
  const text = buildSearchText(
    {
      id: 'Mozilla.Firefox',
      name: 'Firefox',
      publisher: 'Mozilla',
      description: 'A web browser.',
      source: 'winget'
    },
    'Web Browsers'
  );

  assert.equal(matchesQuery(text, tokenize('firefox mozilla')), true);
  assert.equal(matchesQuery(text, tokenize('mozilla browser')), true);
  assert.equal(matchesQuery(text, tokenize('firefox chrome')), false);
  assert.equal(matchesQuery(text, []), true);
});

test('catalog search finds an app by name and publisher', () => {
  assert.ok(matchingIds('google chrome').includes('Google.Chrome'));
  assert.ok(matchingIds('mozilla firefox').includes('Mozilla.Firefox'));
});

test('catalog search matches package IDs and categories', () => {
  assert.ok(matchingIds('Brave.Brave').includes('Brave.Brave'));
  assert.ok(matchingIds('self-hosted').length > 0);
  assert.ok(matchingIds('microsoft store').length > 0);
});

test('catalog search matches descriptions and multiple words in any order', () => {
  assert.ok(matchingIds('password manager').includes('Bitwarden.Bitwarden'));
  assert.ok(matchingIds('manager password').includes('Bitwarden.Bitwarden'));
  assert.ok(matchingIds('network analyzer').includes('WiresharkFoundation.Wireshark'));
});

test('catalog search labels beta entries', () => {
  const betaIds = matchingIds('beta');
  assert.ok(betaIds.includes('TeamSpeakSystems.TeamSpeakClient.Beta.6'));
});
