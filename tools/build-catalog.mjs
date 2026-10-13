#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const UPSTREAM_URL = 'https:
const ID_PATTERN = /^[A-Za-z0-9+][A-Za-z0-9._+-]{1,126}[A-Za-z0-9+]$/;

const FIELDS = ['id', 'name', 'publisher', 'description', 'version', 'homepage', 'category', 'tags'];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function git(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`git ${args.join(' ')} failed: ${stderr || err.message}`));
      else resolve(stdout.trim());
    });
  });
}

async function ensureCheckout(workdir) {
  const repoDir = path.join(workdir, 'winget-pkgs');
  let hasGit = false;
  try {
    await fs.access(path.join(repoDir, '.git'));
    hasGit = true;
  } catch {  }
  if (hasGit) {
    console.log('[catalog] updating existing checkout…');
    await git(['fetch', '--depth', '1', 'origin', 'master'], repoDir);
    await git(['reset', '--hard', 'origin/master'], repoDir);
    const sha = await git(['rev-parse', '--short', 'HEAD'], repoDir);
    return { repoDir, sha, cloned: false };
  }
  console.log('[catalog] cloning winget-pkgs (blobless, sparse)…');
  await fs.mkdir(workdir, { recursive: true });
  await git(
    ['clone', '--depth', '1', '--filter=blob:none', '--sparse', UPSTREAM_URL, repoDir],
    workdir
  );
  const sha = await git(['rev-parse', '--short', 'HEAD'], repoDir);
  return { repoDir, sha, cloned: true };
}

function lsTreeRecursive(repoDir, dir) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['ls-tree', '-r', '-z', 'HEAD', '--', dir], { cwd: repoDir });
    const chunks = [];
    let stderr = '';
    p.stdout.on('data', (d) => chunks.push(d));
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`git ls-tree ${dir} failed: ${stderr}`));
        return;
      }
      const buf = Buffer.concat(chunks).toString('utf8');
      const out = [];
      for (const rec of buf.split('\0')) {
        if (!rec) continue;
        const m = rec.match(/^(\S+) (\S+) ([0-9a-f]{40})\t(.*)$/);
        if (m) out.push({ sha: m[3], path: m[4] });
      }
      resolve(out);
    });
  });
}

async function lsTreeNames(repoDir, dir) {
  const out = await git(['ls-tree', '--name-only', 'HEAD', `${dir}/`], repoDir);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

export async function collectWantedFromGit(repoDir) {
  const buckets = await lsTreeNames(repoDir, 'manifests');
  const wanted = [];
  let packageCount = 0;
  let versionCount = 0;
  for (const bucket of buckets) {
    const files = await lsTreeRecursive(repoDir, bucket);
    const byPkg = new Map(); 
    for (const f of files) {
      const rel = f.path.startsWith('manifests/') ? f.path.slice('manifests/'.length) : f.path;
      const parts = rel.split('/');
      if (parts.length < 5) continue; 
      const file = parts[parts.length - 1];
      const ver = parts[parts.length - 2];
      const key = parts.slice(0, parts.length - 2).join('/');
      if (!byPkg.has(key)) byPkg.set(key, new Map());
      const vmap = byPkg.get(key);
      if (!vmap.has(ver)) vmap.set(ver, []);
      vmap.get(ver).push({ file, sha: f.sha, path: f.path });
    }
    for (const [, vmap] of byPkg) {
      packageCount++;
      const vers = [...vmap.keys()].sort(compareVersions);
      versionCount += vers.length;
      for (let i = vers.length - 1; i >= 0; i--) {
        const flist = vmap.get(vers[i]);
        const locales = flist
          .filter((f) => /\.locale\.[^/]+\.yaml$/.test(f.file))
          .sort((a, b) => (a.file.includes('en-US') ? 0 : 1) - (b.file.includes('en-US') ? 0 : 1));
        if (locales.length === 0) continue;
        wanted.push({ path: locales[0].path, sha: locales[0].sha });
        const inst = flist.find((f) => /\.installer\.yaml$/.test(f.file));
        if (inst) wanted.push({ path: inst.path, sha: inst.sha });
        break;
      }
    }
    console.log(`[catalog] scanned ${bucket} — packages so far: ${packageCount}`);
  }
  return { wanted, packageCount, versionCount };
}

async function fetchBlobs(repoDir, shas) {
  const uniq = [...new Set(shas)];
  for (let i = 0; i < uniq.length; i += 500) {
    const chunk = uniq.slice(i, i + 500);
    await git(['fetch', 'origin', ...chunk], repoDir);
    console.log(`[catalog] fetched blobs ${Math.min(i + 500, uniq.length)}/${uniq.length}`);
  }
}

export function catFileBatch(repoDir, shas) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['cat-file', '--batch'], { cwd: repoDir });
    const results = new Array(shas.length);
    let buf = Buffer.alloc(0);
    let idx = 0;
    let failed = false;
    const fail = (msg) => {
      if (!failed) {
        failed = true;
        try { p.kill(); } catch {  }
        reject(new Error(msg));
      }
    };
    p.stdout.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (idx < shas.length) {
        const nl = buf.indexOf(0x0a);
        if (nl === -1) break;
        const header = buf.slice(0, nl).toString('utf8');
        const m = header.match(/^([0-9a-f]{40}) (\S+) (\d+)$/);
        if (!m) {
          if (/ missing$/.test(header)) {
            results[idx++] = { missing: true };
            buf = buf.slice(nl + 1);
            continue;
          }
          fail(`unexpected cat-file header: ${header}`);
          return;
        }
        const size = parseInt(m[3], 10);
        if (buf.length < nl + 1 + size + 1) break; 
        results[idx++] = { text: buf.slice(nl + 1, nl + 1 + size).toString('utf8') };
        buf = buf.slice(nl + 1 + size + 1);
      }
      if (idx >= shas.length) p.stdin.end();
    });
    p.on('error', (e) => fail(`git cat-file failed: ${e.message}`));
    p.on('close', (code) => {
      if (failed) return;
      if (idx < shas.length) fail(`cat-file ended early (${idx}/${shas.length}, code ${code})`);
      else resolve(results);
    });
    p.stdin.on('error', () => {  });
    p.stdin.write(shas.join('\n') + '\n');
  });
}

async function downloadSubset(workdir, commitSha, wanted, concurrency = 10) {
  const dest = path.join(workdir, 'subset');
  let done = 0;
  let downloaded = 0;
  let resumed = 0;
  const failed = [];
  const queue = [...wanted];
  async function fetchOne(url, attempts = 4) {
    for (let a = 0; a < attempts; a++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45000);
      try {
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { 'User-Agent': 'openwin-catalog-generator' }
        });
        if (res.status === 200) return await res.text();
        if (res.status === 404) return null; 
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500 * (a + 1)));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (a === attempts - 1) throw e;
        await new Promise((r) => setTimeout(r, 1500 * (a + 1)));
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }
  async function worker() {
    while (queue.length > 0) {
      const w = queue.pop();
      const fp = path.join(dest, w.path);
      try {
        const st = await fs.stat(fp).catch(() => null);
        if (st && st.size > 0) {
          resumed++;
        } else {
          const url = encodeURI(`https:
          const text = await fetchOne(url);
          if (text === null) {
            failed.push(w.path);
          } else {
            await fs.mkdir(path.dirname(fp), { recursive: true });
            await fs.writeFile(fp, text);
            downloaded++;
          }
        }
      } catch (e) {
        failed.push(`${w.path} (${e.message})`);
      }
      done++;
      if (done % 1000 === 0) {
        console.log(`[catalog] downloaded ${done}/${wanted.length} (new=${downloaded} resumed=${resumed} failed=${failed.length})`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`[catalog] download done: new=${downloaded} resumed=${resumed} failed=${failed.length}`);
  return { dest: path.join(dest, 'manifests'), failed };
}

export function compareVersions(a, b) {
  const pa = String(a).split(/[.+_~-]/);
  const pb = String(b).split(/[.+_~-]/);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? '';
    const y = pb[i] ?? '';
    const nx = /^\d+$/.test(x) ? parseInt(x, 10) : null;
    const ny = /^\d+$/.test(y) ? parseInt(y, 10) : null;
    if (nx !== null && ny !== null && nx !== ny) return nx - ny;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function stripQuotes(s) {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

export function parseLocaleManifest(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  let tags = null; 
  let blockKey = null;
  let blockIndent = -1;
  let blockLines = [];

  const flushBlock = () => {
    if (blockKey) {
      const joined = blockLines.join('\n').replace(/\s+/g, ' ').trim();
      if (joined && !out[blockKey]) out[blockKey] = joined.slice(0, 600);
    }
    blockKey = null;
    blockLines = [];
    blockIndent = -1;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^ */)[0].length;

    if (blockKey) {
      if (indent > blockIndent && line.trim()) {
        blockLines.push(line.trim());
        continue;
      }
      flushBlock();
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (tags && listMatch) {
      const t = stripQuotes(listMatch[1]).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      if (t) out.__tags.push(t);
      continue;
    }
    tags = null;

    const kv = line.match(/^([A-Za-z0-9]+):\s*(.*)$/);
    if (!kv || indent > 0) continue;
    const [, key, rest] = kv;
    if (key === 'Tags' && rest === '') {
      tags = true;
      out.__tags = out.__tags || [];
      continue;
    }
    if ((key === 'Description' || key === 'ShortDescription') && /^\s*[|>]/.test(rest)) {
      blockKey = key;
      blockIndent = indent;
      continue;
    }
    if (!(key in out)) out[key] = stripQuotes(rest);
  }
  flushBlock();
  if (out.__tags) {
    out.Tags = [...new Set(out.__tags)].slice(0, 12);
    delete out.__tags;
  }
  return out;
}

export function parseInstallerTypes(text) {
  const types = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*InstallerType:\s*(.+)$/);
    if (!m) continue;
    const t = stripQuotes(m[1]).toLowerCase();
    if (t && t !== 'null' && !types.includes(t)) {
      types.push(t);
      if (types.length >= 3) break;
    }
  }
  return types;
}

const CATEGORY_RULES = [
  ['browsers', /(browser|chromium|gecko|firefox|chrome|brave|opera|vivaldi)/i],
  ['gaming', /(game|gaming|steam|emulator|minecraft|chess|tetris)/i],
  ['communication', /(chat|messag|email|mail|teams|zoom|slack|discord|telegram|voip|webinar|conferenc)/i],
  ['security', /(password|vpn|antivirus|firewall|secur|privacy|2fa|authenticat|keepass|bitwarden)/i],
  ['media', /(audio|video|media|music|photo|image|podcast|stream|player|camera|codec)/i],
  ['office', /(office|word|excel|pdf|note|markdown|todo|calendar|document|spreadsheet)/i],
  ['development', /(develop|editor|ide|code|git|python|node|java|jdk|docker|compiler|terminal|powershell|vim|debug|api|sdk|framework|languag|program)/i],
  ['utilities', /(util|tool|archiv|backup|driver|file|disk|search|compress|zip|sync|tweak|launcher|manager|clean|monitor)/i]
];

export function inferCategory(name, publisher, tags) {
  const hay = `${name} ${publisher} ${(tags || []).join(' ')}`;
  for (const [cat, re] of CATEGORY_RULES) {
    if (re.test(hay)) return cat;
  }
  return 'other';
}

function cleanText(s, max) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim().slice(0, max);
}

async function main() {
  const t0 = Date.now();
  const repoRoot = path.resolve(process.argv[1], '..', '..');
  const workdir = path.resolve(arg('workdir', path.join(repoRoot, '.cache', 'winget-pkgs-src')));
  const outDir = path.resolve(arg('output', path.join(repoRoot, 'public', 'data')));
  const minPackages = parseInt(arg('min-packages', '2000'), 10);
  const maxPackages = arg('max-packages', null) ? parseInt(arg('max-packages', '10'), 10) : null;
  const smokeTest = maxPackages !== null;

  let repoDir;
  let upstreamSha = 'unknown';
  if (hasFlag('no-clone') || arg('source', null)) {
    repoDir = path.resolve(arg('source', path.join(workdir, 'winget-pkgs')));
    try {
      upstreamSha = await git(['rev-parse', '--short', 'HEAD'], repoDir);
    } catch {  }
    console.log(`[catalog] using existing source: ${repoDir} (${upstreamSha})`);
  } else {
    ({ repoDir, sha: upstreamSha } = await ensureCheckout(workdir));
    console.log(`[catalog] upstream @ ${upstreamSha}`);
  }

  let manifestsRoot = path.join(repoDir, 'manifests');
  let gitPackageCount = 0;
  let gitVersionCount = 0;
  let downloadFailedCount = 0;
  try {
    const entries = await fs.readdir(manifestsRoot);
    if (entries.length === 0) throw new Error('empty');
  } catch {
    console.log('[catalog] manifests/ not materialized — using git-mode (ls-tree + pinned-commit download)');
    const { wanted, packageCount, versionCount } = await collectWantedFromGit(repoDir);
    gitPackageCount = packageCount;
    gitVersionCount = versionCount;
    console.log(`[catalog] packages=${packageCount} versions=${versionCount} wanted files=${wanted.length}`);
    if (wanted.length === 0) {
      console.error('[catalog] FATAL: no usable manifests found');
      process.exit(2);
    }
    const fullSha = await git(['rev-parse', 'HEAD'], repoDir);
    const { dest, failed } = await downloadSubset(workdir, fullSha, wanted);
    downloadFailedCount = failed.length;
    if (failed.length > 0) {
      console.warn(`[catalog] ${failed.length} files failed to download (first: ${failed.slice(0, 3).join('; ')})`);
    }
    manifestsRoot = dest;
    console.log(`[catalog] subset ready at ${manifestsRoot}`);
  }

  const versionsByPkg = new Map(); 
  let dirCount = 0;
  async function walk(dir, depth) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const names = entries.filter((e) => !e.isDirectory()).map((e) => e.name);
    if (depth >= 3 && names.some((f) => /\.locale\.[^/]+\.yaml$/.test(f))) {
      const key = path.relative(manifestsRoot, path.dirname(dir));
      dirCount++;
      if (!versionsByPkg.has(key)) versionsByPkg.set(key, []);
      versionsByPkg.get(key).push(dir);
      return; 
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      await walk(path.join(dir, e.name), depth + 1);
    }
  }
  await walk(manifestsRoot, 0);
  console.log(`[catalog] found ${versionsByPkg.size} package dirs, ${dirCount} version dirs`);

  const apps = [];
  const skipped = { 'no-locale': 0, 'missing-id': 0, 'bad-id': 0, 'missing-name': 0, 'read-error': 0 };

  for (const [, versionDirs] of versionsByPkg) {
    if (smokeTest && apps.length >= maxPackages) break;
    versionDirs.sort((a, b) => compareVersions(path.basename(b), path.basename(a)));
    let picked = null;
    for (const vdir of versionDirs) {
      let files;
      try {
        files = await fs.readdir(vdir);
      } catch {
        continue;
      }
      const locales = files.filter((f) => /\.locale\.[^/]+\.yaml$/.test(f)).sort((a, b) => {
        const ae = a.includes('en-US') ? 0 : 1;
        const be = b.includes('en-US') ? 0 : 1;
        return ae - be || (a < b ? -1 : 1);
      });
      if (locales.length === 0) {
        skipped['no-locale']++;
        continue;
      }
      let parsed = null;
      let installerTypes = [];
      try {
        const text = await fs.readFile(path.join(vdir, locales[0]), 'utf8');
        parsed = parseLocaleManifest(text);
        const installerFile = files.find((f) => /\.installer\.yaml$/.test(f));
        if (installerFile) {
          const itext = await fs.readFile(path.join(vdir, installerFile), 'utf8');
          installerTypes = parseInstallerTypes(itext);
        }
      } catch {
        skipped['read-error']++;
        continue;
      }
      const id = (parsed.PackageIdentifier || '').trim();
      if (!id) {
        skipped['missing-id']++;
        continue;
      }
      if (!ID_PATTERN.test(id)) {
        skipped['bad-id']++;
        continue;
      }
      const rawName = cleanText(parsed.PackageName, 80);
      const name = rawName.replace(/\s+\([A-Za-z]{2}(?:[-_][A-Za-z]{2})?\)$/, '');
      if (!name) {
        skipped['missing-name']++;
        continue;
      }
      const tags = Array.isArray(parsed.Tags) ? parsed.Tags : [];
      picked = {
        id,
        name,
        publisher: cleanText(parsed.Publisher || 'Unknown publisher', 60),
        description: cleanText(parsed.ShortDescription || parsed.Description || '', 220),
        version: cleanText(parsed.PackageVersion || path.basename(vdir), 40),
        homepage: cleanText(parsed.PackageUrl || parsed.PublisherUrl || '', 160),
        tags,
        installerTypes
      };
      break; 
    }
    if (picked) {
      picked.category = inferCategory(picked.name, picked.publisher, picked.tags);
      apps.push(picked);
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const a of apps) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    deduped.push(a);
  }
  deduped.sort((a, b) => (a.id < b.id ? -1 : 1));

  const complete = !smokeTest && deduped.length >= minPackages;
  const meta = {
    generator: 'tools/build-catalog.mjs',
    source: UPSTREAM_URL,
    upstreamCommit: upstreamSha,
    generatedAt: new Date().toISOString(),
    complete,
    smokeTest,
    count: deduped.length,
    packageDirs: versionsByPkg.size,
    versionDirs: dirCount,
    upstreamPackageDirs: gitPackageCount || undefined,
    upstreamVersionDirs: gitVersionCount || undefined,
    downloadFailed: downloadFailedCount,
    skipped,
    fields: FIELDS
  };

  await fs.mkdir(outDir, { recursive: true });
  const rows = deduped.map((a) => [
    a.id, a.name, a.publisher, a.description, a.version, a.homepage, a.category, a.tags.join(' ')
  ]);
  const fullPath = path.join(outDir, 'catalog-full.json');
  await fs.writeFile(fullPath, JSON.stringify({ meta, fields: FIELDS, apps: rows }));

  let popular = [];
  try {
    const idsText = await fs.readFile(path.join(repoRoot, 'tools', 'popular-ids.txt'), 'utf8');
    const wanted = idsText.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
    popular = wanted.filter((id) => seen.has(id));
  } catch {  }
  await fs.writeFile(
    path.join(outDir, 'popular.json'),
    JSON.stringify({ meta: { generatedAt: meta.generatedAt, count: popular.length }, ids: popular })
  );

  const bytes = (await fs.stat(fullPath)).size;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[catalog] indexed=${deduped.length} skipped=${JSON.stringify(skipped)}`);
  console.log(`[catalog] popular=${popular.length} bytes=${bytes} time=${secs}s`);
  console.log(`[catalog] COMPLETE=${complete}`);
  if (!complete) {
    console.error(
      `[catalog] INCOMPLETE: indexed ${deduped.length} (minimum ${minPackages})` +
      (smokeTest ? ' — smoke-test mode caps the package count.' : '.')
    );
    process.exit(3);
  }
}

import { pathToFileURL } from 'node:url';

const invokedAsScript =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  main().catch((err) => {
    console.error(`[catalog] FATAL: ${err.message}`);
    process.exit(2);
  });
}
