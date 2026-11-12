import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAppsHash, parseAppsHash } from '../src/share.js';

const known = new Set(['Brave.Brave', 'Microsoft.VCRedist.2015+.x64', '7zip.7zip']);
const isKnown = (id) => known.has(id);

test('buildAppsHash keeps package IDs readable', () => {
  assert.equal(buildAppsHash([]), '');
  assert.equal(
    buildAppsHash(['Brave.Brave', '7zip.7zip']),
    'apps=Brave.Brave,7zip.7zip'
  );
});

test('parseAppsHash restores selections and preserves plus signs', () => {
  assert.deepEqual(
    parseAppsHash('#apps=Brave.Brave,Microsoft.VCRedist.2015+.x64', isKnown),
    ['Brave.Brave', 'Microsoft.VCRedist.2015+.x64']
  );
  assert.deepEqual(
    parseAppsHash('#apps=Brave.Brave,Microsoft.VCRedist.2015%2B.x64', isKnown),
    ['Brave.Brave', 'Microsoft.VCRedist.2015+.x64']
  );
});

test('parseAppsHash ignores unknown and malformed entries', () => {
  assert.deepEqual(parseAppsHash('#apps=Brave.Brave,Unknown.App', isKnown), ['Brave.Brave']);
  assert.deepEqual(parseAppsHash('#apps=%E0%A4%A', isKnown), []);
  assert.deepEqual(parseAppsHash('#apps=', isKnown), []);
});

test('parseAppsHash returns null when there is no apps parameter', () => {
  assert.equal(parseAppsHash('', isKnown), null);
  assert.equal(parseAppsHash('#', isKnown), null);
  assert.equal(parseAppsHash('#section', isKnown), null);
  assert.equal(parseAppsHash('#other=Brave.Brave', isKnown), null);
});

test('parseAppsHash finds apps among other fragment parameters', () => {
  assert.deepEqual(parseAppsHash('#view=grid&apps=7zip.7zip', isKnown), ['7zip.7zip']);
});
