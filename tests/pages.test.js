import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const infoPages = ['why.html', 'privacy.html', 'security.html', 'contact.html'];
const allPages = ['index.html', ...infoPages, '404.html'];

function readPage(page) {
  return readFileSync(path.join(projectRoot, page), 'utf8');
}

function localReferences(html) {
  return [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter(
      (value) =>
        value.startsWith('./') &&
        !value.startsWith('./#') &&
        !value.startsWith('//')
    )
    .map((value) => value.split('#')[0])
    .filter(Boolean);
}

function pngDimensions(file) {
  const buffer = readFileSync(path.join(projectRoot, file));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${file} is a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('every page exists with basic metadata and a stylesheet', () => {
  for (const page of allPages) {
    const html = readPage(page);

    assert.match(html, /^<!doctype html>/i, `${page} has a doctype`);
    assert.match(html, /<html lang="en">/, `${page} declares English`);
    assert.match(html, /<meta charset="UTF-8" \/>/, `${page} declares UTF-8`);
    assert.match(html, /name="viewport"/, `${page} has a viewport`);
    assert.match(html, /name="description"/, `${page} has a description`);
    assert.match(html, /<title>[^<]+<\/title>/, `${page} has a title`);
    assert.match(html, /href="\.\/src\/style\.css"/, `${page} links the shared stylesheet`);
    assert.match(html, /class="skip-link"/, `${page} has a skip link`);
    assert.match(html, /<main[\s>]/, `${page} has a main landmark`);
  }

  for (const page of [...infoPages, '404.html']) {
    assert.match(readPage(page), /<main id="main"/, `${page} has a labelled main landmark`);
  }
});

test('every local page and asset reference resolves to a file', () => {
  for (const page of allPages) {
    for (const reference of localReferences(readPage(page))) {
      const target = path.resolve(projectRoot, reference);
      const publicTarget = path.resolve(projectRoot, 'public', reference);
      assert.ok(
        existsSync(target) || existsSync(publicTarget),
        `${page} references missing local file: ${reference}`
      );
    }
  }
});

test('the app picker has canonical and social metadata', () => {
  const html = readPage('index.html');

  assert.match(html, /rel="canonical" href="https:\/\/fsamod\.github\.io\/openwin\/"/);
  assert.match(html, /property="og:image" content="https:\/\/fsamod\.github\.io\/openwin\/og-image\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/);
  assert.match(html, /id="categorySelect"/);
  assert.match(html, /id="dialogPreview"/);
});

test('every page uses the open-window icon set', () => {
  for (const page of allPages) {
    const html = readPage(page);

    assert.match(html, /rel="icon" href="\.\/favicon\.ico" sizes="any"/, `${page} links the ICO favicon`);
    assert.match(html, /rel="apple-touch-icon" href="\.\/apple-touch-icon\.png"/, `${page} links the touch icon`);
    assert.match(html, /rel="manifest" href="\.\/site\.webmanifest"/, `${page} links the manifest`);
    assert.match(html, /class="brand-mark" src="\.\/brand-mark\.png"/, `${page} uses the new header mark`);
    assert.doesNotMatch(html, /data:image\/svg\+xml/, `${page} no longer uses the inline SVG icon`);
  }
});

test('icon assets have the expected dimensions', () => {
  const sizes = new Map([
    ['public/favicon-16x16.png', 16],
    ['public/favicon-32x32.png', 32],
    ['public/apple-touch-icon.png', 180],
    ['public/brand-mark.png', 128],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
    ['docs/logo.png', 256],
    ['docs/github-avatar.png', 1024]
  ]);

  for (const [file, size] of sizes) {
    const dimensions = pngDimensions(file);
    assert.equal(dimensions.width, size, `${file} is ${size}px wide`);
    assert.equal(dimensions.height, size, `${file} is ${size}px tall`);
  }

  assert.deepEqual(pngDimensions('public/og-image.png'), { width: 1200, height: 630 });
  assert.deepEqual(pngDimensions('docs/social-preview.png'), { width: 1280, height: 640 });
});

test('the web app manifest points at existing icons', () => {
  const manifest = JSON.parse(
    readFileSync(path.join(projectRoot, 'public', 'site.webmanifest'), 'utf8')
  );

  assert.equal(manifest.name, 'OpenWin');
  assert.equal(manifest.icons.length, 2);

  for (const icon of manifest.icons) {
    const file = path.join(projectRoot, 'public', icon.src.replace(/^\.\//, ''));
    assert.ok(existsSync(file), `manifest icon exists: ${icon.src}`);
    assert.match(icon.sizes, /^\d+x\d+$/);
    assert.equal(icon.type, 'image/png');
  }
});

test('information pages have canonical URLs and current-page navigation', () => {
  for (const page of infoPages) {
    const html = readPage(page);
    assert.match(
      html,
      new RegExp(`rel="canonical" href="https://fsamod\\.github\\.io/openwin/${page}"`),
      `${page} has a canonical URL`
    );
    assert.match(
      html,
      new RegExp(`href="\\./${page}" aria-current="page"`),
      `${page} marks its navigation link as current`
    );
    assert.match(html, /These information pages are currently available in English only/);
  }
});

test('the privacy page documents storage, URL fragments, and hosting logs', () => {
  const html = readPage('privacy.html');

  for (const phrase of [
    'openwin-selection-v1',
    'openwin-lang-v1',
    'openwin-theme-v1',
    'localStorage',
    '#apps=',
    'GitHub Pages',
    'fsamod@proton.me'
  ]) {
    assert.ok(html.includes(phrase), `privacy page mentions ${phrase}`);
  }

  assert.match(html, /no accounts, cookies, analytics/i);
});

test('the security page separates OpenWin checks from winget and Store checks', () => {
  const html = readPage('security.html');

  assert.match(html, /What OpenWin checks/);
  assert.match(html, /What OpenWin does not check/);
  assert.match(html, /What winget and the Microsoft Store do/);
  assert.match(html, /does not claim that any app is malware-free/i);
  assert.match(html, /Content Security Policy/);
});

test('the contact page publishes the contact email and keeps GitHub Issues for public reports', () => {
  const html = readPage('contact.html');

  assert.match(html, /mailto:fsamod@proton\.me/);
  assert.match(html, /github\.com\/fsamod\/openwin\/issues\/new"/);
  assert.match(html, /id="copyTemplate"/);
  assert.match(html, /id="feedbackTemplate"/);
});

test('the app picker includes the header pull cord', () => {
  const html = readPage('index.html');
  const headerEnd = html.indexOf('</header>');
  const ropeIndex = html.indexOf('id="ropeCanvas"');

  assert.ok(ropeIndex > 0 && ropeIndex < headerEnd);
  assert.match(html, /src="\.\/src\/rope\.js"/);
  assert.match(html, /role="button"/);
  assert.match(html, /aria-label="Toggle light and dark theme"/);
  assert.doesNotMatch(html, /rope-hint/);
  assert.doesNotMatch(html, /footer-rope/);
});

test('the app picker includes a compact theme toggle for small screens', () => {
  const html = readPage('index.html');
  const headerEnd = html.indexOf('</header>');
  const toggleIndex = html.indexOf('id="themeToggle"');

  assert.ok(toggleIndex > 0 && toggleIndex < headerEnd);
  assert.match(html, /class="theme-toggle"/);
  assert.match(html, /aria-label="Switch to light theme"/);

  const script = readFileSync(path.join(projectRoot, 'src', 'theme.js'), 'utf8');
  assert.match(script, /#themeToggle/);
  assert.match(script, /addEventListener\('click', toggleTheme\)/);
});

test('every page carries the footer signature', () => {
  for (const page of allPages) {
    assert.match(readPage(page), /class="footer-signature">from mars by fsamod</);
  }
});

test('every page initializes the theme before the stylesheet', () => {
  for (const page of allPages) {
    const html = readPage(page);
    const scriptIndex = html.indexOf('src="./theme-init.js"');
    const styleIndex = html.indexOf('href="./src/style.css"');

    assert.ok(scriptIndex > 0, `${page} loads the theme initializer`);
    assert.ok(styleIndex > 0, `${page} loads the stylesheet`);
    assert.ok(scriptIndex < styleIndex, `${page} initializes the theme before the stylesheet`);
  }
});

test('the 404 page is not indexable and links back to the picker', () => {
  const html = readPage('404.html');

  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, /href="\.\/index\.html"/);
  assert.doesNotMatch(html, /rel="canonical"/);
});

test('the sitemap lists every public page except the 404 page', () => {
  const sitemap = readFileSync(path.join(projectRoot, 'public', 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.ok(urls.includes('https://fsamod.github.io/openwin/'));
  for (const page of infoPages) {
    assert.ok(
      urls.includes(`https://fsamod.github.io/openwin/${page}`),
      `sitemap lists ${page}`
    );
  }
  assert.ok(!urls.some((url) => url.endsWith('/404.html')));
  assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});
