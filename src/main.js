import { isGenericHost } from './icon-sources.js';

const ID_PATTERN = /^[A-Za-z0-9+][A-Za-z0-9._+-]{1,126}[A-Za-z0-9+]$/;
const STORAGE_KEY = 'openwin-basket-v1';
const OLD_STORAGE_KEY = 'winget-hub-basket-v1';
const OPTS_KEY = 'openwin-install-opts-v1';
const PAGE_SIZE = 60;

const CATEGORY_LABELS = {
  browsers: 'Browsers',
  development: 'Development',
  media: 'Media',
  communication: 'Communication',
  utilities: 'Utilities',
  security: 'Security',
  office: 'Office & Notes',
  gaming: 'Gaming',
  other: 'Other'
};

const CATEGORY_OVERRIDES = {
  'Rufus.Rufus': 'utilities',
  'DBBrowserForSQLite.DBBrowserForSQLite': 'development',
  'Microsoft.PowerToys': 'utilities',
  'PuTTY.PuTTY': 'development',
  'BlenderFoundation.Blender': 'media',
  'KDE.Krita': 'media',
  'ShareX.ShareX': 'utilities',
  'qBittorrent.qBittorrent': 'utilities',
  'Transmission.Transmission': 'utilities',
  'AnyDesk.AnyDesk': 'utilities',
  'AutoHotkey.AutoHotkey': 'utilities',
  'CPUID.CPU-Z': 'utilities',
  'Greenshot.Greenshot': 'utilities',
  'NickeManarin.ScreenToGif': 'utilities',
  'Anki.Anki': 'office',
  'calibre.calibre': 'office',
  'Microsoft.VisualStudio.2022.Community': 'development',
  'Insomnia.Insomnia': 'development',
  'Okta.OktaVerify': 'security',
  'StandardNotes.StandardNotes': 'office',
  'EarTrumpet.EarTrumpet': 'media',
  'Microsoft.VisualStudioCode': 'development'
};

const state = {
  apps: [],
  byId: new Map(),
  allowlist: new Set(),
  meta: null,
  fullCatalog: false,
  featured: [],
  featuredSet: new Set(),
  sectionOpen: new Set(),
  query: '',
  category: 'all',
  featuredTab: 'popular',
  view: 'discover',
  basket: [],
  visible: PAGE_SIZE,
  detailId: null,
  opts: { format: 'commands', scope: 'default', silent: true, pin: false }
};

const els = {};
for (const id of [
  'searchInput', 'tabDiscover', 'tabBasket', 'tabAbout', 'basketCount', 'basketCount2',
  'catalogNotice', 'aboutStats',
  'discoverView', 'basketView', 'aboutView', 'featuredSection', 'featuredGrid', 'featuredTabs',
  'browseHeading', 'categoryNav', 'resultMeta', 'appGrid',
  'moreBtn', 'emptyState', 'clearSearch', 'basketGrid', 'basketEmpty',
  'backToBrowse', 'basketList', 'clearBasket', 'scriptOutput', 'copyScript',
  'shareBasket', 'formatSelect', 'scopeSelect', 'silentCheck', 'pinCheck',
  'copyStatus', 'detailOverlay', 'detailIcon', 'detailName', 'detailVerifiedBadge',
  'detailPublisher', 'detailVerifiedLink', 'detailDesc', 'detailId', 'detailCopyId', 'detailVersion',
  'detailCategory', 'detailHome', 'detailTags', 'detailToggle', 'detailClose',
  'detailStatLicense', 'detailStatPlatform', 'detailStatType', 'detailStatCategory', 'detailStatDownloads',
  'detailLinkWeb', 'detailLinkManifest',
  'catalogMeta'
]) {
  els[id] = document.getElementById(id);
}
els.brandHome = document.getElementById('brandHome');
els.categorySections = document.getElementById('categorySections');

function isValidId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id) && state.allowlist.has(id);
}

function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)) % 360;
  const h2 = (h + 45) % 360;
  return `linear-gradient(135deg, hsl(${h} 60% 48%), hsl(${h2} 60% 34%))`;
}

function descText(app) {
  if (app.description) return app.description;
  if (app.tags) {
    const tags = app.tags.split(' ').filter(Boolean).slice(0, 5).join(' · ');
    if (tags) return tags;
  }
  return app.id;
}

function domainOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function iconUrlFor(app) {
  const host = domainOf(app.homepage);
  if (!host || isGenericHost(host)) return '';
  return `https://icons.duckduckgo.com/ip3/${host}.ico`;
}

function iconEl(app) {
  const wrap = document.createElement('div');
  wrap.className = 'icon-wrap';
  const src = iconUrlFor(app);
  if (!src) {
    wrap.appendChild(avatarEl(app));
    return wrap;
  }
  const img = document.createElement('img');
  img.width = 60;
  img.height = 60;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.alt = '';
  img.addEventListener('error', () => {
    img.remove();
    wrap.appendChild(avatarEl(app));
  });
  img.src = src;
  wrap.appendChild(img);
  return wrap;
}

function avatarEl(app) {
  const av = document.createElement('div');
  av.className = 'avatar';
  av.style.background = avatarColor(app.name);
  av.textContent = (app.name || '?').trim().charAt(0).toUpperCase();
  av.setAttribute('aria-hidden', 'true');
  return av;
}


function loadBasket() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((x) => typeof x === 'string'))];
  } catch {
    return [];
  }
}

function saveBasket() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.basket));
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {}
}

function toggleBasket(id) {
  if (!isValidId(id)) return;
  state.basket = state.basket.includes(id)
    ? state.basket.filter((x) => x !== id)
    : [...state.basket, id];
  saveBasket();
  renderAll();
}


function scoreApp(app, tokens, rawQuery) {
  const q = rawQuery.toLowerCase();
  if (app.id.toLowerCase() === q) return 0;
  const name = app._name;
  const id = app._id;
  let score = 99;
  for (const tok of tokens) {
    let s = -1;
    if (id === tok) s = 0;
    else if (id.startsWith(tok)) s = 1;
    else if (name.startsWith(tok)) s = 2;
    else if (name.includes(tok)) s = 3;
    else if (app._pub.includes(tok)) s = 4;
    else if (app._hay.includes(tok)) s = 5;
    if (s === -1) return -1;
    score = Math.min(score, s);
  }
  return score;
}

function filteredApps() {
  const raw = state.query.trim().toLowerCase();
  const tokens = raw.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return state.featured
      .map((id) => state.byId.get(id))
      .filter((a) => a && (state.category === 'all' || a.category === state.category));
  }

  let list = state.apps;
  if (state.category !== 'all') list = list.filter((a) => a.category === state.category);
  const scored = [];
  for (const app of list) {
    const s = scoreApp(app, tokens, raw);
    if (s >= 0) scored.push([s, app]);
  }
  scored.sort((a, b) => a[0] - b[0] || (a[1].name < b[1].name ? -1 : 1));
  list = scored.map((x) => x[1]);
  return list;
}


function cardEl(app) {
  const selected = state.basket.includes(app.id);
  const card = document.createElement('article');
  card.className = 'card' + (selected ? ' selected' : '');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-pressed', String(selected));
  card.setAttribute('aria-label', `${app.name} - toggle selection`);
  card.dataset.id = app.id;

  const top = document.createElement('div');
  top.className = 'card-top';
  const iconNode = iconEl(app);
  iconNode.style.cursor = 'pointer';
  iconNode.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(app.id);
  });
  top.appendChild(iconNode);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'card-body';
  const h = document.createElement('h3');
  h.textContent = app.name;
  h.title = `${app.name} (${app.publisher || 'App'})`;
  h.style.cursor = 'pointer';
  h.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(app.id);
  });
  if (state.featuredSet && state.featuredSet.has(app.id)) {
    const check = document.createElement('span');
    check.className = 'verified-check';
    check.title = 'Featured app';
    check.setAttribute('aria-label', 'Featured app');
    check.setAttribute('role', 'img');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const seal = document.createElementNS(svgNS, 'path');
    seal.setAttribute(
      'd',
      'M24.00,12.00 L21.95,14.67 L22.39,18.00 L19.28,19.28 L18.00,22.39 L14.67,21.95 L12.00,24.00 L9.33,21.95 L6.00,22.39 L4.72,19.28 L1.61,18.00 L2.05,14.67 L0.00,12.00 L2.05,9.33 L1.61,6.00 L4.72,4.72 L6.00,1.61 L9.33,2.05 L12.00,0.00 L14.67,2.05 L18.00,1.61 L19.28,4.72 L22.39,6.00 L21.95,9.33 Z'
    );
    seal.setAttribute('fill', '#1d9bf0');
    const tick = document.createElementNS(svgNS, 'path');
    tick.setAttribute('d', 'M7.2,12.4 L10.6,15.8 L17.2,9.2');
    tick.setAttribute('fill', 'none');
    tick.setAttribute('stroke', '#fff');
    tick.setAttribute('stroke-width', '2.4');
    tick.setAttribute('stroke-linecap', 'round');
    tick.setAttribute('stroke-linejoin', 'round');
    svg.append(seal, tick);
    check.appendChild(svg);
    h.appendChild(check);
  }
  titleWrap.appendChild(h);
  top.appendChild(titleWrap);
  const sel = document.createElement('button');
  sel.type = 'button';
  sel.className = 'select-btn';
  sel.setAttribute('aria-label', `${selected ? 'Remove' : 'Add'} ${app.name}`);
  sel.setAttribute('aria-pressed', String(selected));
  top.appendChild(sel);

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = descText(app);

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'detail-btn';
  info.textContent = 'Details';
  info.setAttribute('aria-label', `${app.name} details`);

  card.append(top, desc, info);

  const toggle = () => toggleBasket(app.id);
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
  sel.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  info.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(app.id);
  });
  return card;
}

function renderCategories() {
  const counts = new Map();
  for (const a of state.featured.map((id) => state.byId.get(id)).filter(Boolean)) {
    counts.set(a.category, (counts.get(a.category) || 0) + 1);
  }
  const cats = ['all', ...Object.keys(CATEGORY_LABELS).filter((c) => counts.has(c))];
  els.categoryNav.innerHTML = '';
  for (const c of cats) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.textContent = c === 'all' ? 'All' : CATEGORY_LABELS[c];
    b.setAttribute('aria-pressed', String(state.category === c));
    b.addEventListener('click', () => {
      state.category = c;
      state.visible = PAGE_SIZE;
      renderCategories();
      renderSections();
      renderGrid();
    });
    els.categoryNav.appendChild(b);
  }
}

const categoryCounts = new Map();
function countOfCategory(cat) {
  if (!categoryCounts.size) {
    for (const a of state.apps) categoryCounts.set(a.category, (categoryCounts.get(a.category) || 0) + 1);
  }
  return categoryCounts.get(cat) || 0;
}

function defaultBrowse() {
  return !state.query.trim() && state.category === 'all' && state.view === 'discover';
}

function heroIds() {
  return new Set(state.featured.slice(0, 6));
}

function spotlightInCategory(cat) {
  const hero = heroIds();
  return state.featured
    .map((id) => state.byId.get(id))
    .filter((a) => a && a.category === cat && !hero.has(a.id));
}

function renderSections() {
  const host = els.categorySections;
  if (!host) return;
  host.innerHTML = '';
  if (!defaultBrowse()) return;
  for (const c of Object.keys(CATEGORY_LABELS).filter((x) => x !== 'other')) {
    const all = spotlightInCategory(c);
    if (all.length === 0) continue;
    const expanded = state.sectionOpen.has(c);
    const shown = expanded ? all : all.slice(0, 6);
    const sec = document.createElement('section');
    sec.setAttribute('aria-label', CATEGORY_LABELS[c]);
    const h = document.createElement('h2');
    h.textContent = CATEGORY_LABELS[c];
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const app of shown) grid.appendChild(cardEl(app));

    const more = document.createElement('div');
    more.className = 'more-wrap';
    if (all.length > 6) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-section-more';
      btn.textContent = expanded ? 'Show less' : `Show ${all.length - 6} more`;
      btn.addEventListener('click', () => {
        if (expanded) state.sectionOpen.delete(c);
        else state.sectionOpen.add(c);
        renderSections();
      });
      more.appendChild(btn);
    }
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'btn btn-ghost btn-section-more';
    jump.textContent = `Search all ${countOfCategory(c).toLocaleString()} ${CATEGORY_LABELS[c].toLowerCase()} packages`;
    jump.addEventListener('click', () => {
      els.searchInput.focus();
      els.searchInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    more.appendChild(jump);
    sec.append(h, grid, more);
    host.appendChild(sec);
  }
}

function featuredAppsForTab(tab) {
  if (state.featured.length === 0) return [];
  const spotlightApps = state.featured.map((id) => state.byId.get(id)).filter(Boolean);

  if (tab === 'popular') {
    return spotlightApps.slice(0, 6);
  }
  if (tab === 'trending') {
    const trendingSet = new Set([
      'Microsoft.VisualStudioCode', 'Obsidian.Obsidian', 'Docker.DockerDesktop',
      'Valve.Steam', 'Brave.Brave', 'Discord.Discord', 'ShareX.ShareX', 'Notion.Notion'
    ]);
    const trending = spotlightApps.filter((a) => trendingSet.has(a.id));
    return (trending.length >= 6 ? trending : spotlightApps).slice(0, 6);
  }
  if (tab === 'new') {
    const newArrivals = new Set([
      'DuckDuckGo.DesktopBrowser', 'Ecosia.EcosiaBrowser', 'Tailscale.Tailscale',
      'Rem0o.FanControl', 'FlorianHeidenreich.Mp3tag', 'DigitalScholar.Zotero',
      'Windscribe.Windscribe', 'Proton.ProtonVPN'
    ]);
    const fresh = spotlightApps.filter((a) => newArrivals.has(a.id));
    return (fresh.length >= 6 ? fresh : spotlightApps.slice(12, 18)).slice(0, 6);
  }
  if (tab === 'updated') {
    const updatedArrivals = new Set([
      'VideoLAN.VLC', 'Mozilla.Firefox', 'Google.Chrome', 'Git.Git',
      'Microsoft.PowerToys', '7zip.7zip'
    ]);
    const updated = spotlightApps.filter((a) => updatedArrivals.has(a.id));
    return (updated.length >= 6 ? updated : spotlightApps.slice(6, 12)).slice(0, 6);
  }
  return spotlightApps.slice(0, 6);
}

function renderFeatured() {
  const show = !state.query.trim() && state.category === 'all' && state.featured.length > 0;
  els.featuredSection.hidden = !show;
  if (!show) return;

  if (els.featuredTabs) {
    els.featuredTabs.querySelectorAll('.featured-tab').forEach((btn) => {
      const active = btn.dataset.tab === state.featuredTab;
      btn.setAttribute('aria-selected', String(active));
    });
  }

  els.featuredGrid.innerHTML = '';
  const apps = featuredAppsForTab(state.featuredTab);
  for (const app of apps) {
    els.featuredGrid.appendChild(cardEl(app));
  }
}

function renderGrid() {
  let list = filteredApps();
  if (!state.query.trim() && state.category === 'all' && state.featured.length > 0) {
    const shown = new Set(state.featured.slice(0, 6));
    list = list.filter((a) => !shown.has(a.id));
  }
  els.browseHeading.textContent =
    state.query.trim() || state.category !== 'all' ? 'Results' : 'Spotlight apps';
  if (list.length === 0) {
    els.resultMeta.textContent = '';
  } else if (state.query.trim()) {
    els.resultMeta.textContent =
      `Showing ${Math.min(state.visible, list.length).toLocaleString()} of ${list.length.toLocaleString()} ` +
      `match${list.length === 1 ? '' : 'es'} for “${state.query.trim()}” across all ${state.apps.length.toLocaleString()} packages`;
  } else {
    els.resultMeta.textContent =
      `Showing ${list.length} spotlighted app${list.length === 1 ? '' : 's'}` +
      (state.category === 'all'
        ? ` · search to explore all ${state.apps.length.toLocaleString()} packages`
        : '');
  }
  els.appGrid.innerHTML = '';
  for (const app of list.slice(0, state.visible)) {
    els.appGrid.appendChild(cardEl(app));
  }
  els.emptyState.hidden = list.length !== 0;
  els.moreBtn.style.display = list.length > state.visible ? '' : 'none';
}

function renderBasketView() {
  const items = state.basket.map((id) => state.byId.get(id)).filter(Boolean);
  els.basketEmpty.style.display = items.length ? 'none' : '';
  els.basketGrid.innerHTML = '';
  for (const app of items) els.basketGrid.appendChild(cardEl(app));
}

function loadOpts() {
  try {
    const raw = localStorage.getItem(OPTS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    return {
      format: ['commands', 'powershell', 'configure'].includes(o.format) ? o.format : 'commands',
      scope: ['default', 'user', 'machine'].includes(o.scope) ? o.scope : 'default',
      silent: o.silent !== false,
      pin: o.pin === true
    };
  } catch {
    return null;
  }
}

function saveOpts() {
  try {
    localStorage.setItem(OPTS_KEY, JSON.stringify(state.opts));
  } catch {}
}

function basketToHash() {
  if (state.basket.length === 0) return location.pathname + location.search;
  return '#apps=' + state.basket.map((id) => encodeURIComponent(id)).join(',');
}

function hashToBasket() {
  const m = location.hash.match(/^#apps=(.*)$/);
  if (!m) return null;
  return m[1].split(',').map((s) => {
    try {
      return decodeURIComponent(s.trim());
    } catch {
      return '';
    }
  }).filter(Boolean);
}

function syncHash() {
  try {
    history.replaceState(null, '', basketToHash());
  } catch {}
}

function installArgs(app) {
  const args = ['winget', 'install', '--exact', '--id', app.id];
  if (state.opts.scope !== 'default') args.push('--scope', state.opts.scope);
  if (state.opts.silent) args.push('--silent');
  if (state.opts.pin && app.version) args.push('--version', app.version);
  args.push('--accept-package-agreements', '--accept-source-agreements');
  return args.join(' ');
}

function buildScript() {
  const valid = state.basket.map((id) => state.byId.get(id)).filter((a) => a && isValidId(a.id));
  if (valid.length === 0) return '';
  if (state.opts.format === 'powershell') {
    const lines = [
      '# Generated by OpenWin. Review every line, then run on your Windows PC.',
      '# Requires Windows 10 1809+ with App Installer (winget).',
      ''
    ];
    for (const app of valid) {
      lines.push(`# ${app.name} (${app.publisher || 'App'})`);
      lines.push(installArgs(app));
      lines.push('');
    }
    return lines.join('\r\n').trimEnd();
  }
  if (state.opts.format === 'configure') {
    const lines = [
      '# Generated by OpenWin. Review every line, then run:',
      '# winget configure install-apps.winget',
      'properties:',
      '  configurationVersion: 0.2.0',
      '  assertions:',
      '    - resource: Microsoft.Windows/OsInfo',
      '      directives:',
      '        description: Requires Windows 10 1809 or later.',
      '      settings:',
      '        minimumVersion: 10.0.17763',
      '  resources:'
    ];
    for (const app of valid) {
      lines.push('    - resource: Microsoft.WinGet.DSC/WinGetPackage');
      lines.push(`      directives:`);
      lines.push(`        description: Install ${app.name} (${app.publisher || 'App'}).`);
      lines.push(`      settings:`);
      lines.push(`        id: ${app.id}`);
      lines.push(`        source: winget`);
      if (state.opts.pin && app.version) lines.push(`        version: ${app.version}`);
    }
    return lines.join('\n');
  }
  const lines = [];
  for (const app of valid) {
    lines.push(installArgs(app));
  }
  return lines.join('\r\n');
}

function renderBasket() {
  els.basketCount.textContent = String(state.basket.length);
  if (els.basketCount2) els.basketCount2.textContent = String(state.basket.length);
  for (const [tab, view] of [['tabDiscover', 'discover'], ['tabBasket', 'basket'], ['tabAbout', 'about']]) {
    if (els[tab]) els[tab].setAttribute('aria-pressed', String(state.view === view));
  }
  els.discoverView.hidden = state.view !== 'discover';
  els.basketView.hidden = state.view !== 'basket';
  if (els.aboutView) els.aboutView.hidden = state.view !== 'about';

  const items = state.basket.map((id) => state.byId.get(id)).filter(Boolean);
  els.basketList.innerHTML = '';
  for (const app of items) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = app.name + ' ';
    const code = document.createElement('code');
    code.textContent = app.id;
    label.appendChild(code);
    const dom = domainOf(app.homepage);
    if (dom) {
      const ds = document.createElement('span');
      ds.className = 'dom';
      ds.textContent = ' · ' + dom;
      label.appendChild(ds);
    }
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'mini-btn';
    rm.textContent = 'Remove';
    rm.setAttribute('aria-label', `Remove ${app.name}`);
    rm.addEventListener('click', () => toggleBasket(app.id));
    li.append(label, rm);
    els.basketList.appendChild(li);
  }
  els.clearBasket.disabled = items.length === 0;

  const script = buildScript();
  els.scriptOutput.textContent = script;
  els.copyScript.disabled = !script;
  if (els.shareBasket) els.shareBasket.disabled = !script;
  syncHash();
  renderBasketView();
}


function openDetail(id) {
  const app = state.byId.get(id);
  if (!app) return;
  state.detailId = id;
  els.detailIcon.innerHTML = '';
  els.detailIcon.appendChild(iconEl(app));
  els.detailIcon.className = 'detail-icon-wrap icon-wrap';
  els.detailName.textContent = app.name;
  els.detailPublisher.textContent = app.publisher ? `by ${app.publisher}` : '';
  els.detailDesc.textContent = app.description || descText(app);
  els.detailId.textContent = app.id;
  els.detailVersion.textContent = app.version || 'N/A';
  const catLabel = CATEGORY_LABELS[app.category] || app.category;
  els.detailCategory.textContent = catLabel;

  if (els.detailStatCategory) els.detailStatCategory.textContent = catLabel;
  if (els.detailStatDownloads) {
    els.detailStatDownloads.textContent = state.featuredSet.has(app.id) ? 'Spotlight' : 'Catalog';
  }
  if (els.detailStatLicense) {
    const isOSS = /gpl|mit|apache|bsd|mpl|free|open source|oss/i.test(
      `${app.name} ${app.publisher} ${app.tags || ''} ${app.description || ''}`
    );
    els.detailStatLicense.textContent = isOSS ? 'Open Source' : 'Free / OSS';
  }

  if (els.detailVerifiedBadge) {
    els.detailVerifiedBadge.innerHTML = '';
    if (state.featuredSet && state.featuredSet.has(app.id)) {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const seal = document.createElementNS(svgNS, 'path');
      seal.setAttribute(
        'd',
        'M24.00,12.00 L21.95,14.67 L22.39,18.00 L19.28,19.28 L18.00,22.39 L14.67,21.95 L12.00,24.00 L9.33,21.95 L6.00,22.39 L4.72,19.28 L1.61,18.00 L2.05,14.67 L0.00,12.00 L2.05,9.33 L1.61,6.00 L4.72,4.72 L6.00,1.61 L9.33,2.05 L12.00,0.00 L14.67,2.05 L18.00,1.61 L19.28,4.72 L22.39,6.00 L21.95,9.33 Z'
      );
      seal.setAttribute('fill', '#1d9bf0');
      const tick = document.createElementNS(svgNS, 'path');
      tick.setAttribute('d', 'M7.2,12.4 L10.6,15.8 L17.2,9.2');
      tick.setAttribute('fill', 'none');
      tick.setAttribute('stroke', '#fff');
      tick.setAttribute('stroke-width', '2.4');
      tick.setAttribute('stroke-linecap', 'round');
      tick.setAttribute('stroke-linejoin', 'round');
      svg.append(seal, tick);
      els.detailVerifiedBadge.appendChild(svg);
      els.detailVerifiedBadge.style.display = 'inline-block';
    } else {
      els.detailVerifiedBadge.style.display = 'none';
    }
  }

  if (els.detailVerifiedLink) {
    if (app.homepage) {
      els.detailVerifiedLink.href = app.homepage;
      els.detailVerifiedLink.textContent = domainOf(app.homepage) || app.homepage;
      els.detailVerifiedLink.style.display = 'inline-flex';
    } else {
      els.detailVerifiedLink.style.display = 'none';
    }
  }

  if (app.homepage) {
    els.detailHome.href = app.homepage;
    els.detailHome.textContent = domainOf(app.homepage) || app.homepage;
  } else {
    els.detailHome.removeAttribute('href');
    els.detailHome.textContent = 'None';
  }

  if (els.detailLinkWeb) {
    if (app.homepage) {
      els.detailLinkWeb.href = app.homepage;
      els.detailLinkWeb.style.display = 'flex';
    } else {
      els.detailLinkWeb.style.display = 'none';
    }
  }

  if (els.detailLinkManifest) {
    const parts = app.id.split('.');
    const firstLetter = parts[0].charAt(0).toLowerCase();
    const manifestPath = `manifests/${firstLetter}/${parts.slice(0, -1).join('/')}/${parts[parts.length - 1]}`;
    els.detailLinkManifest.href = `https://github.com/microsoft/winget-pkgs/tree/master/${manifestPath}`;
  }

  els.detailTags.textContent = app.tags ? app.tags.split(' ').slice(0, 12).join(', ') : 'None';
  syncDetailToggle();
  els.detailOverlay.hidden = false;
  els.detailClose.focus();
}

function syncDetailToggle() {
  const inBasket = state.basket.includes(state.detailId);
  els.detailToggle.textContent = inBasket ? 'Remove from My Apps' : 'Add to My Apps';
  els.detailToggle.className = inBasket ? 'btn btn-installed' : 'btn btn-install';
}

function closeDetail() {
  els.detailOverlay.hidden = true;
  state.detailId = null;
}


async function copyScript() {
  els.copyStatus.textContent = '';
  const text = els.scriptOutput.textContent;
  if (!text) return;
  const hint =
    state.opts.format === 'configure'
      ? 'Copied. Save it as install-apps.winget and run: winget configure install-apps.winget'
      : state.opts.format === 'powershell'
        ? 'Copied. Save it as install.ps1 and run it on your Windows PC.'
        : 'Copied. Paste it into CMD on your Windows PC.';
  try {
    await navigator.clipboard.writeText(text);
    els.copyStatus.textContent = hint;
  } catch {
    const range = document.createRange();
    range.selectNodeContents(els.scriptOutput);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try {
      document.execCommand('copy');
      els.copyStatus.textContent = hint;
    } catch {
      els.copyStatus.textContent = 'Copy failed. Select the text manually.';
    }
  }
}

async function copyShare() {
  els.copyStatus.textContent = '';
  if (state.basket.length === 0) return;
  const url = location.origin + location.pathname + basketToHash();
  try {
    await navigator.clipboard.writeText(url);
    els.copyStatus.textContent = 'Link copied. Anyone opening it gets your basket.';
  } catch {
    els.copyStatus.textContent = url;
  }
}

function syncOptControls() {
  if (els.formatSelect) els.formatSelect.value = state.opts.format;
  if (els.scopeSelect) els.scopeSelect.value = state.opts.scope;
  if (els.silentCheck) els.silentCheck.checked = state.opts.silent;
  if (els.pinCheck) els.pinCheck.checked = state.opts.pin;
}

function renderAll() {
  renderFeatured();
  renderSections();
  renderGrid();
  renderBasket();
}

function setView(view) {
  state.view = view;
  renderBasket();
}

let searchTimer = null;


function prepApp(app) {
  app._name = (app.name || '').toLowerCase();
  app._id = (app.id || '').toLowerCase();
  app._pub = (app.publisher || '').toLowerCase();
  app._hay = `${app._name} ${app._id} ${app._pub} ${(app.description || '').toLowerCase()} ${(app.tags || '').toLowerCase()}`;
  return app;
}

async function loadData() {
  const base = import.meta.env.BASE_URL;
  try {
    const res = await fetch(`${base}data/catalog-full.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const fields = data.fields || [];
    const idx = Object.fromEntries(fields.map((f, i) => [f, i]));
    state.apps = (data.apps || []).map((row) =>
      prepApp({
        id: row[idx.id] || '',
        name: row[idx.name] || row[idx.id] || 'Unknown app',
        publisher: row[idx.publisher] || 'Unknown publisher',
        description: row[idx.description] || '',
        version: row[idx.version] || '',
        homepage: row[idx.homepage] || '',
        category: row[idx.category] || 'other',
        tags: row[idx.tags] || '',
        verified: true
      })
    );
    state.meta = data.meta || null;
    state.fullCatalog = !!(state.meta && state.meta.complete && state.apps.length > 0);
  } catch {
    state.apps = [];
    state.meta = null;
    state.fullCatalog = false;
  }

  if (state.apps.length === 0) {
    try {
      const res = await fetch(`${base}data/catalog.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.apps = (Array.isArray(data) ? data : data.apps || []).map((a) =>
        prepApp({
          id: a.id,
          name: a.name,
          publisher: a.publisher,
          description: a.description || '',
          version: a.version || '',
          homepage: a.homepage || '',
          category: a.category || 'other',
          tags: Array.isArray(a.tags) ? a.tags.join(' ') : '',
          verified: !!a.verified
        })
      );
      state.meta = data.meta || null;
    } catch {
      throw new Error('Could not load any app catalog.');
    }
  }

  state.byId = new Map(state.apps.map((a) => [a.id, a]));
  for (const a of state.apps) {
    const fixed = CATEGORY_OVERRIDES[a.id];
    if (fixed && CATEGORY_LABELS[fixed]) a.category = fixed;
  }
  state.allowlist = new Set(
    state.apps.filter((a) => a && (state.fullCatalog || a.verified) && ID_PATTERN.test(a.id)).map((a) => a.id)
  );

  try {
    const res = await fetch(`${base}data/popular.json`);
    if (res.ok) {
      const data = await res.json();
      state.featured = (data.ids || []).filter((id) => state.byId.has(id));
      state.featuredSet = new Set(state.featured);
    }
  } catch {}
}

function renderMeta() {
  if (state.fullCatalog) {
    els.catalogNotice.hidden = true;
    els.catalogMeta.textContent =
      `${state.apps.length.toLocaleString()} packages indexed from winget-pkgs` +
      (state.meta.upstreamCommit && state.meta.upstreamCommit !== 'unknown' ? ` @ ${state.meta.upstreamCommit}` : '') +
      (state.meta.generatedAt ? ` on ${state.meta.generatedAt.slice(0, 10)}` : '') +
      `. Categories and icons are best-effort; metadata comes from community manifests.`;
  } else if (state.meta && state.meta.complete === false && state.apps.length > 200) {
    els.catalogNotice.hidden = false;
    els.catalogNotice.textContent =
      `Catalog update incomplete (${state.apps.length.toLocaleString()} packages): showing what was indexed. Search results may miss apps.`;
    els.catalogMeta.textContent = `Partial catalog: ${state.apps.length.toLocaleString()} packages.`;
  } else {
    els.catalogNotice.hidden = false;
    els.catalogNotice.textContent =
      `Full catalog unavailable: showing a curated snapshot of ${state.apps.length} popular apps.`;
    els.catalogMeta.textContent =
      `Curated snapshot: ${state.apps.length} apps, each verified with winget show --exact.`;
  }
  if (els.aboutStats) {
    els.aboutStats.textContent =
      `Indexing ${state.apps.length.toLocaleString()} Windows packages. Updated weekly from upstream.`;
  }
}

async function init() {
  els.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = e.target.value;
      state.visible = PAGE_SIZE;
      if (state.view !== 'discover') setView('discover');
      renderFeatured();
      renderSections();
      renderGrid();
    }, 120);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== els.searchInput) {
      e.preventDefault();
      els.searchInput.focus();
    } else if (e.key === 'Escape' && !els.detailOverlay.hidden) {
      closeDetail();
    }
  });

  els.moreBtn.addEventListener('click', () => {
    state.visible += PAGE_SIZE;
    renderGrid();
  });
  els.clearSearch.addEventListener('click', () => {
    els.searchInput.value = '';
    state.query = '';
    state.category = 'all';
    state.visible = PAGE_SIZE;
    renderCategories();
    renderSections();
    renderFeatured();
    renderGrid();
  });

  if (els.featuredTabs) {
    els.featuredTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.featured-tab');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab && tab !== state.featuredTab) {
        state.featuredTab = tab;
        renderFeatured();
      }
    });
  }

  els.tabDiscover.addEventListener('click', () => setView('discover'));
  els.tabBasket.addEventListener('click', () => setView('basket'));
  if (els.tabAbout) els.tabAbout.addEventListener('click', () => setView('about'));
  document.querySelectorAll('footer a[data-view]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setView(a.dataset.view);
      window.scrollTo({ top: 0 });
    });
  });
  els.backToBrowse.addEventListener('click', () => setView('discover'));
  els.clearBasket.addEventListener('click', () => {
    state.basket = [];
    saveBasket();
    renderAll();
  });
  els.copyScript.addEventListener('click', copyScript);
  if (els.shareBasket) els.shareBasket.addEventListener('click', copyShare);
  const onOpts = () => {
    if (els.formatSelect) state.opts.format = els.formatSelect.value;
    if (els.scopeSelect) state.opts.scope = els.scopeSelect.value;
    if (els.silentCheck) state.opts.silent = els.silentCheck.checked;
    if (els.pinCheck) state.opts.pin = els.pinCheck.checked;
    saveOpts();
    renderBasket();
  };
  if (els.formatSelect) els.formatSelect.addEventListener('change', onOpts);
  if (els.scopeSelect) els.scopeSelect.addEventListener('change', onOpts);
  if (els.silentCheck) els.silentCheck.addEventListener('change', onOpts);
  if (els.pinCheck) els.pinCheck.addEventListener('change', onOpts);
  window.addEventListener('hashchange', () => {
    const ids = hashToBasket();
    if (!ids) return;
    state.basket = [...new Set(ids)].filter((id) => state.allowlist.has(id));
    saveBasket();
    renderAll();
  });

  els.detailClose.addEventListener('click', closeDetail);
  els.detailOverlay.addEventListener('click', (e) => {
    if (e.target === els.detailOverlay) closeDetail();
  });
  els.detailToggle.addEventListener('click', () => {
    if (state.detailId) {
      toggleBasket(state.detailId);
      syncDetailToggle();
    }
  });
  els.detailCopyId.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.detailId.textContent);
    } catch {}
  });

  try {
    await loadData();
  } catch {
    els.resultMeta.textContent = 'Could not load the app catalog. Check your connection and reload.';
    return;
  }

  const savedOpts = loadOpts();
  if (savedOpts) state.opts = savedOpts;
  syncOptControls();

  const shared = hashToBasket();
  if (shared) {
    state.basket = [...new Set(shared)].filter((id) => state.allowlist.has(id));
  } else {
    state.basket = loadBasket().filter((id) => state.allowlist.has(id));
  }

  renderMeta();
  renderCategories();
  renderAll();
}

init();
