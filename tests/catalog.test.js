import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeHttpUrl, isValidApp } from '../src/catalog.js';
import { buildCommandText, buildInstallCommand } from '../src/install-commands.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(projectRoot, 'src', 'data', 'apps.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const categoryIds = new Set(catalog.categories.map((category) => category.id));
const appsById = new Map(catalog.apps.map((app) => [app.id, app]));

test('catalog contains the fixed 231 apps in 11 categories', () => {
  assert.equal(catalog.apps.length, 231);
  assert.equal(catalog.categories.length, 11);
  assert.equal(catalog.meta.count, 231);
  assert.equal(catalog.meta.categories, 11);
});

test('catalog entries have unique IDs and valid categories and sources', () => {
  const ids = new Set();

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

test('every catalog entry passes shared validation', () => {
  for (const app of catalog.apps) {
    assert.equal(isValidApp(app, categoryIds), true, `${app.id} fails catalog validation`);
    assert.equal(isSafeHttpUrl(app.homepage), true, `${app.id} has an unsafe homepage`);
  }
});

test('catalog validation rejects unsafe or incomplete entries', () => {
  const valid = {
    id: 'Example.App',
    name: 'Example',
    publisher: 'Example',
    description: 'An example app.',
    homepage: 'https://example.com/',
    category: 'utilities',
    source: 'winget',
    icon: 'icons/example.app.png'
  };

  assert.equal(isValidApp(valid, categoryIds), true);
  assert.equal(isValidApp({ ...valid, id: 'Example"; calc.exe' }, categoryIds), false);
  assert.equal(isValidApp({ ...valid, source: 'chocolatey' }, categoryIds), false);
  assert.equal(isValidApp({ ...valid, category: 'unknown' }, categoryIds), false);
  assert.equal(isValidApp({ ...valid, icon: '../outside.png' }, categoryIds), false);
  assert.equal(isValidApp({ ...valid, preview: 'yes' }, categoryIds), false);
  assert.equal(isValidApp({ ...valid, name: '   ' }, categoryIds), false);
  assert.equal(isValidApp({ ...valid, preview: true }, categoryIds), true);
});

test('safe URL validation accepts HTTP and HTTPS only', () => {
  assert.equal(isSafeHttpUrl('https://example.com/path'), true);
  assert.equal(isSafeHttpUrl('http://example.com/'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,test'), false);
  assert.equal(isSafeHttpUrl('https://user:pass@example.com/'), false);
  assert.equal(isSafeHttpUrl('not a url'), false);
  assert.equal(isSafeHttpUrl(null), false);
});

test('catalog descriptions stay short and factual', () => {
  for (const app of catalog.apps) {
    assert.ok(
      app.description.length <= 220,
      `${app.id} description is ${app.description.length} characters`
    );
    assert.doesNotMatch(app.description, /\b(malware-free|virus-free|100% safe)\b/i);
  }
});

test('every app icon exists in public/icons', () => {
  for (const app of catalog.apps) {
    assert.match(app.icon, /^icons\/[^/]+\.(?:png|jpe?g|svg|ico)$/, `${app.id} has an invalid icon path`);
    const iconPath = path.join(projectRoot, 'public', app.icon);
    assert.ok(existsSync(iconPath), `missing icon for ${app.id}: ${app.icon}`);
  }
});

test('known catalog corrections are preserved', () => {
  const chatgpt = appsById.get('9PLM9XGG6VKS');
  assert.equal(chatgpt.homepage, 'https://apps.microsoft.com/detail/9plm9xgg6vks');

  assert.equal(appsById.get('Zen-Team.Zen-Browser').publisher, 'Zen OSS Team');
  assert.equal(appsById.get('GoLang.Go').publisher, 'The Go Authors');

  const teamSpeakBeta = appsById.get('TeamSpeakSystems.TeamSpeakClient.Beta.6');
  assert.equal(teamSpeakBeta.preview, true);
  assert.match(teamSpeakBeta.name, /Beta/i);

  assert.equal(appsById.get('Hugo.Hugo.Extended').category, 'development');
  assert.equal(appsById.get('sylikc.JPEGView').category, 'multimedia');
  assert.equal(appsById.get('XBMCFoundation.Kodi').category, 'multimedia');
  assert.equal(appsById.get('LocalSend.LocalSend').category, 'utilities');
  assert.equal(appsById.get('WinsiderSS.SystemInformer').category, 'system');

  for (const id of ['Microsoft.VCRedist.2015+.x86', 'Microsoft.VCRedist.2015+.x64']) {
    assert.equal(
      appsById.get(id).homepage,
      'https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist'
    );
  }

  assert.equal(
    appsById.get('Blur009.BlurAutoClicker').homepage,
    'https://autoclicker.blur009.com'
  );

  assert.equal(appsById.get('ES-DE.EmulationStation-DE').homepage, 'https://www.es-de.org/');
  assert.equal(appsById.has('Emulationstation.Emulationstation'), false);
});

test('only known beta entries are marked as previews', () => {
  const previews = catalog.apps.filter((app) => app.preview).map((app) => app.id);
  assert.deepEqual(previews, ['TeamSpeakSystems.TeamSpeakClient.Beta.6']);
});

test('all 231 catalog apps generate exact winget commands', () => {
  const commands = buildCommandText(catalog.apps).split('\n');

  assert.equal(commands.length, 231);

  for (const [index, app] of catalog.apps.entries()) {
    assert.equal(commands[index], buildInstallCommand(app), `command mismatch for ${app.id}`);
  }
});
