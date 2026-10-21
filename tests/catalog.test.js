import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandText, buildInstallCommand } from '../src/install-commands.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(projectRoot, 'src', 'data', 'apps.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

test('catalog contains the fixed 231 apps in 11 categories', () => {
  assert.equal(catalog.apps.length, 231);
  assert.equal(catalog.categories.length, 11);
  assert.equal(catalog.meta.count, 231);
});

test('catalog entries have unique IDs and valid categories and sources', () => {
  const ids = new Set();
  const categoryIds = new Set(catalog.categories.map((category) => category.id));

  for (const app of catalog.apps) {
    assert.ok(app.id, 'every app has an ID');
    assert.ok(!ids.has(app.id), `duplicate app ID: ${app.id}`);
    ids.add(app.id);

    assert.ok(categoryIds.has(app.category), `${app.id} has an unknown category`);
    assert.ok(['winget', 'msstore'].includes(app.source), `${app.id} has an unknown source`);
    assert.ok(app.name.trim().length > 0, `${app.id} has no name`);
    assert.ok(app.publisher.trim().length > 0, `${app.id} has no publisher`);
    assert.ok(app.description.trim().length > 0, `${app.id} has no description`);
    assert.match(app.homepage, /^https?:\/\//, `${app.id} has an invalid homepage`);
  }
});

test('every app icon exists in public/icons', () => {
  for (const app of catalog.apps) {
    assert.match(app.icon, /^icons\/[^/]+$/, `${app.id} has an invalid icon path`);
    const iconPath = path.join(projectRoot, 'public', app.icon);
    assert.ok(existsSync(iconPath), `missing icon for ${app.id}: ${app.icon}`);
  }
});

test('all 231 catalog apps generate exact winget commands', () => {
  const commands = buildCommandText(catalog.apps).split('\n');

  assert.equal(commands.length, 231);

  for (const [index, app] of catalog.apps.entries()) {
    assert.equal(commands[index], buildInstallCommand(app), `command mismatch for ${app.id}`);
  }
});
