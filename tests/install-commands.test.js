import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandText, buildInstallCommand } from '../src/install-commands.js';

const brave = { id: 'Brave.Brave', source: 'winget' };
const whatsapp = { id: '9NKSQGP7F2NH', source: 'msstore' };
const vcredist = { id: 'Microsoft.VCRedist.2015+.x86', source: 'winget' };

test('builds an exact winget command for a catalog app', () => {
  const command = buildInstallCommand(brave);

  assert.equal(
    command,
    'winget install --id "Brave.Brave" --source winget --exact ' +
      '--accept-package-agreements --accept-source-agreements --disable-interactivity'
  );
});

test('uses the Microsoft Store source for Store packages', () => {
  assert.match(buildInstallCommand(whatsapp), /--id "9NKSQGP7F2NH" --source msstore/);
});

test('keeps package IDs that contain a plus sign intact', () => {
  assert.match(buildInstallCommand(vcredist), /--id "Microsoft\.VCRedist\.2015\+\.x86"/);
});

test('joins selected commands in catalog order', () => {
  const commands = buildCommandText([brave, whatsapp]).split('\n');

  assert.equal(commands.length, 2);
  assert.match(commands[0], /Brave\.Brave/);
  assert.match(commands[1], /9NKSQGP7F2NH/);
});

test('returns an empty command block when nothing is selected', () => {
  assert.equal(buildCommandText([]), '');
});

test('rejects unsafe package IDs and unknown sources', () => {
  assert.throws(
    () => buildInstallCommand({ id: 'Brave"; calc.exe', source: 'winget' }),
    /Invalid package ID/
  );
  assert.throws(
    () => buildInstallCommand({ id: 'Brave.Brave', source: 'chocolatey' }),
    /Invalid package source/
  );
});
