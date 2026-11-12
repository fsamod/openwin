import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../vite.config.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function policyPlugin() {
  return config.plugins.find((plugin) => plugin.name === 'openwin-content-security-policy');
}

test('Vite builds every page and uses a modern target', () => {
  const inputs = config.build.rollupOptions.input;

  assert.deepEqual(Object.keys(inputs).sort(), [
    'contact',
    'main',
    'notFound',
    'privacy',
    'security',
    'why'
  ]);
  assert.equal(config.build.target, 'es2022');
  assert.equal(config.base, './');
});

test('the production build injects a restrictive Content Security Policy', () => {
  const plugin = policyPlugin();
  assert.ok(plugin, 'CSP plugin is configured');
  assert.equal(plugin.apply, 'build');

  const result = plugin.transformIndexHtml('<html><head></head><body></body></html>');
  const tag = result.tags.find((entry) => entry.attrs['http-equiv'] === 'Content-Security-Policy');

  assert.ok(tag, 'CSP meta tag is injected');
  assert.equal(tag.injectTo, 'head-prepend');

  for (const directive of [
    "default-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'"
  ]) {
    assert.ok(tag.attrs.content.includes(directive), `CSP includes ${directive}`);
  }
});

test('the project requires a supported Node.js version and current Vite', () => {
  assert.match(packageJson.engines.node, />=22\.12\.0/);
  assert.match(packageJson.devDependencies.vite, /^\^8\./);
  assert.equal(packageJson.scripts.check, 'npm test && npm run build');
});
