#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'public', 'data');

const full = JSON.parse(await fs.readFile(path.join(outDir, 'catalog-full.json'), 'utf8'));
const idx = Object.fromEntries((full.fields || []).map((f, i) => [f, i]));
const seen = new Set((full.apps || []).map((r) => r[idx.id]));

const text = await fs.readFile(path.join(repoRoot, 'tools', 'popular-ids.txt'), 'utf8');
const wanted = text
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('#'));

const missing = [];
const ids = [];
const added = new Set();
for (const id of wanted) {
  if (!seen.has(id)) {
    if (!missing.includes(id)) missing.push(id);
    continue;
  }
  if (added.has(id)) continue;
  added.add(id);
  ids.push(id);
}

await fs.writeFile(
  path.join(outDir, 'popular.json'),
  JSON.stringify({
    meta: {
      generatedAt: (full.meta && full.meta.generatedAt) || new Date().toISOString(),
      count: ids.length
    },
    ids
  })
);

console.log(`[popular] ${ids.length} spotlight apps written`);
if (missing.length) {
  console.log(`[popular] WARNING ${missing.length} id(s) not in the catalog — fix the ID or the catalog is stale:`);
  for (const id of missing) console.log(`           ${id}`);
  process.exitCode = 1;
}