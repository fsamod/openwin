import appData from './data/apps.json';
import { copyText } from './clipboard.js';
import { isSafeHttpUrl, isValidApp } from './catalog.js';
import { buildCommandText } from './install-commands.js';
import { countLabel, getLanguage, initI18n, t, onLanguageChange } from './i18n.js';
import { buildSearchText, matchesQuery, tokenize } from './search.js';
import { buildAppsHash, parseAppsHash } from './share.js';

const ICON_BASE = import.meta.env.BASE_URL || './';
const STORAGE_KEY = 'openwin-selection-v1';

const categories = Array.isArray(appData.categories)
  ? appData.categories.filter(
      (category) =>
        category &&
        typeof category.id === 'string' &&
        category.id.trim() !== '' &&
        typeof category.name === 'string' &&
        category.name.trim() !== ''
    )
  : [];
const categoryIds = new Set(categories.map((category) => category.id));
const rawApps = Array.isArray(appData.apps) ? appData.apps : [];
const apps = rawApps.filter((app) => {
  const isValid = isValidApp(app, categoryIds);

  if (!isValid) {
    console.warn('Skipping invalid catalog entry:', app);
  }

  return isValid;
});

const byId = new Map(apps.map((app) => [app.id, app]));
const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

function byIdElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

const elements = {
  heroCount: byIdElement('heroCount'),
  searchInput: byIdElement('searchInput'),
  categorySelect: byIdElement('categorySelect'),
  resultCount: byIdElement('resultCount'),
  categoryColumns: byIdElement('categoryColumns'),
  emptyState: byIdElement('emptyState'),
  emptyMessage: byIdElement('emptyMessage'),
  clearSearch: byIdElement('clearSearch'),
  installSection: byIdElement('install'),
  installSummary: byIdElement('installSummary'),
  copyBtn: byIdElement('copyBtn'),
  shareBtn: byIdElement('shareBtn'),
  actionStatus: byIdElement('actionStatus'),
  previewCount: byIdElement('previewCount'),
  commandPreview: byIdElement('commandPreview'),
  stickyBar: byIdElement('stickyBar'),
  stickyCount: byIdElement('stickyCount'),
  stickyCopyBtn: byIdElement('stickyCopyBtn'),
  appDialog: byIdElement('appDialog'),
  dialogClose: byIdElement('dialogClose'),
  dialogIcon: byIdElement('dialogIcon'),
  dialogName: byIdElement('dialogName'),
  dialogPublisher: byIdElement('dialogPublisher'),
  dialogSource: byIdElement('dialogSource'),
  dialogPreview: byIdElement('dialogPreview'),
  dialogDesc: byIdElement('dialogDesc'),
  dialogId: byIdElement('dialogId'),
  dialogCopyId: byIdElement('dialogCopyId'),
  dialogCopyStatus: byIdElement('dialogCopyStatus'),
  dialogCategory: byIdElement('dialogCategory'),
  dialogHomeRow: byIdElement('dialogHomeRow'),
  dialogHome: byIdElement('dialogHome'),
  dialogToggle: byIdElement('dialogToggle'),
  supportBtn: byIdElement('supportBtn'),
  supportDialog: byIdElement('supportDialog'),
  supportClose: byIdElement('supportClose'),
  supportStatus: byIdElement('supportStatus'),
  languageSelect: byIdElement('languageSelect'),
  catalogFootnote: byIdElement('catalogFootnote')
};

const selected = new Set();
const checkboxById = new Map();
const rowRecords = [];
const categoryStates = [];

let activeDialogId = null;
let installSectionVisible = false;
let statusTimer = null;
let dialogStatusTimer = null;
let supportStatusTimer = null;

function iconUrl(app) {
  return `${ICON_BASE}${app.icon}`;
}

function createIcon(app, className) {
  const wrap = document.createElement('span');
  wrap.className = className;

  const image = document.createElement('img');
  image.src = iconUrl(app);
  image.alt = '';
  image.width = 16;
  image.height = 16;
  image.loading = 'lazy';
  image.decoding = 'async';

  const fallback = document.createElement('span');
  fallback.className = 'icon-fallback';
  fallback.textContent = app.name.trim().charAt(0).toUpperCase();
  fallback.hidden = true;

  image.addEventListener('error', () => {
    image.hidden = true;
    fallback.hidden = false;
  });

  wrap.append(image, fallback);
  return wrap;
}

function createAppRow(app, index) {
  const row = document.createElement('li');
  row.className = 'app-row';
  row.dataset.id = app.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'app-check';
  checkbox.id = `app-check-${index}`;
  checkbox.dataset.id = app.id;

  const label = document.createElement('label');
  label.className = 'app-main';
  label.htmlFor = checkbox.id;
  label.title = app.name;

  const name = document.createElement('span');
  name.className = 'app-name';
  name.textContent = app.name;

  label.append(createIcon(app, 'icon-wrap'), name);

  if (app.preview) {
    const badge = document.createElement('span');
    badge.className = 'app-badge';
    badge.textContent = t('dialog.preview');
    label.append(badge);
  }

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'info-btn';
  info.dataset.id = app.id;

  const detailsLabel = t('details.aria', { name: app.name });
  info.setAttribute('aria-label', detailsLabel);
  info.title = detailsLabel;

  const glyph = document.createElement('span');
  glyph.className = 'info-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = 'i';
  info.append(glyph);

  row.append(checkbox, label, info);
  checkboxById.set(app.id, checkbox);
  return row;
}

function renderCatalog() {
  for (const category of categories) {
    const categoryApps = apps.filter((app) => app.category === category.id);

    const section = document.createElement('section');
    section.className = 'category';
    section.id = `category-${category.id}`;

    const heading = document.createElement('h3');
    heading.id = `category-heading-${category.id}`;
    heading.append(category.name);

    const count = document.createElement('span');
    count.className = 'cat-count';
    count.textContent = String(categoryApps.length);
    heading.append(' ', count);

    const list = document.createElement('ul');
    list.className = 'app-list';

    const state = {
      id: category.id,
      section,
      count,
      total: categoryApps.length,
      records: []
    };

    categoryApps.forEach((app) => {
      const row = createAppRow(app, rowRecords.length);
      const record = { row, app, searchText: buildSearchText(app, category.name) };

      list.append(row);
      rowRecords.push(record);
      state.records.push(record);
    });

    section.append(heading, list);
    elements.categoryColumns.append(section);
    categoryStates.push(state);
  }
}

function selectedApps() {
  return apps.filter((app) => selected.has(app.id));
}

function persistSelection() {
  const ids = selectedApps().map((app) => app.id);

  try {
    if (ids.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
  }
}

function shareUrlFor(ids) {
  const url = new URL(window.location.href);
  url.hash = buildAppsHash(ids);
  return url.toString();
}

function syncUrl() {
  try {
    const nextUrl = shareUrlFor(selectedApps().map((app) => app.id));
    if (nextUrl !== window.location.href) {
      window.history.replaceState(null, '', nextUrl);
    }
  } catch {
  }
}

function restoreSelectionFromUrl() {
  const nextSelection = readHashSelection();
  if (nextSelection === null) {
    return;
  }

  selected.clear();
  for (const id of nextSelection) {
    if (byId.has(id)) {
      selected.add(id);
    }
  }

  updateSelectionUI();
  persistSelection();
}

function readStoredSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readHashSelection() {
  return parseAppsHash(window.location.hash, (id) => byId.has(id));
}

function clearStatus() {
  window.clearTimeout(statusTimer);
  elements.actionStatus.textContent = '';
  elements.actionStatus.classList.remove('is-error');
}

function showStatus(message, isError = false) {
  elements.actionStatus.textContent = message;
  elements.actionStatus.classList.toggle('is-error', isError);
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(clearStatus, 7000);
}

function updateStickyBar() {
  const isVisible = selected.size > 0 && !installSectionVisible;
  elements.stickyBar.hidden = !isVisible;
  document.body.classList.toggle('has-sticky-bar', isVisible);
}

function updateDialogToggle() {
  if (!activeDialogId) {
    return;
  }

  const isSelected = selected.has(activeDialogId);
  elements.dialogToggle.textContent = isSelected ? t('dialog.remove') : t('dialog.add');
  elements.dialogToggle.classList.toggle('button-primary', !isSelected);
  elements.dialogToggle.classList.toggle('button-secondary', isSelected);
}

function updateSelectionUI() {
  const list = selectedApps();
  const count = list.length;
  const label = countLabel(count);

  for (const [id, checkbox] of checkboxById) {
    const isSelected = selected.has(id);
    checkbox.checked = isSelected;
    const row = checkbox.closest('.app-row');
    if (row) {
      row.classList.toggle('is-selected', isSelected);
    }
  }

  elements.installSummary.textContent =
    count === 0 ? t('summary.none') : t('summary.ready', { count: label });
  elements.copyBtn.disabled = count === 0;
  elements.shareBtn.disabled = count === 0;
  elements.stickyCount.textContent = label;
  elements.previewCount.textContent = count === 0 ? '' : label;

  elements.commandPreview.textContent =
    count === 0
      ? t('preview.empty')
      : buildCommandText(list);

  updateStickyBar();
  updateDialogToggle();
  clearStatus();
}

function setSelection(id, shouldSelect) {
  if (!byId.has(id)) {
    return;
  }

  if (shouldSelect) {
    selected.add(id);
  } else {
    selected.delete(id);
  }

  updateSelectionUI();
  persistSelection();
  syncUrl();
}

function applyFilter() {
  const tokens = tokenize(elements.searchInput.value);
  const selectedCategory = elements.categorySelect.value;
  const hasQuery = tokens.length > 0;
  const hasCategory = selectedCategory !== '';
  let matches = 0;

  for (const state of categoryStates) {
    if (hasCategory && state.id !== selectedCategory) {
      for (const record of state.records) {
        record.row.hidden = true;
      }
      state.section.hidden = true;
      state.count.textContent = String(state.total);
      continue;
    }

    let categoryMatches = 0;

    for (const record of state.records) {
      const isMatch = matchesQuery(record.searchText, tokens);
      record.row.hidden = !isMatch;
      if (isMatch) {
        categoryMatches += 1;
      }
    }

    state.section.hidden = categoryMatches === 0;
    state.count.textContent = hasQuery
      ? `${categoryMatches}/${state.total}`
      : String(state.total);
    matches += categoryMatches;
  }

  elements.emptyState.hidden = matches !== 0;

  if (hasQuery) {
    elements.emptyMessage.textContent = t('empty.titleQuery', {
      query: elements.searchInput.value.trim()
    });
  } else if (hasCategory) {
    elements.emptyMessage.textContent = t('empty.titleFilter');
  } else {
    elements.emptyMessage.textContent = t('empty.title');
  }

  elements.resultCount.textContent =
    hasQuery || hasCategory
      ? t('result.matched', { matched: matches, total: apps.length })
      : countLabel(apps.length);
}

function safeHttpUrl(value) {
  if (!isSafeHttpUrl(value)) {
    return null;
  }

  return new URL(value).href;
}

function openDetails(app) {
  activeDialogId = app.id;
  window.clearTimeout(dialogStatusTimer);
  elements.dialogCopyStatus.textContent = '';
  elements.dialogIcon.replaceChildren(createIcon(app, 'dialog-icon-wrap'));
  elements.dialogName.textContent = app.name;
  elements.dialogPublisher.textContent = app.publisher || t('dialog.unknown');
  elements.dialogSource.textContent =
    app.source === 'msstore' ? t('dialog.source.msstore') : t('dialog.source.winget');
  elements.dialogSource.classList.toggle('is-store', app.source === 'msstore');
  elements.dialogPreview.hidden = !app.preview;
  elements.dialogPreview.textContent = app.preview ? t('dialog.preview') : '';
  elements.dialogDesc.textContent = app.description;
  elements.dialogId.textContent = app.id;
  elements.dialogCategory.textContent = categoryNames.get(app.category) || app.category;

  const homepage = safeHttpUrl(app.homepage);
  elements.dialogHomeRow.hidden = !homepage;
  if (homepage) {
    elements.dialogHome.href = homepage;
    elements.dialogHome.textContent = t('dialog.visit');
  } else {
    elements.dialogHome.removeAttribute('href');
    elements.dialogHome.textContent = '';
  }

  updateDialogToggle();
  elements.appDialog.showModal();
  document.body.classList.add('dialog-open');
}

async function copyCommand() {
  const list = selectedApps();
  if (list.length === 0) {
    return;
  }

  const copied = await copyText(buildCommandText(list));
  showStatus(
    copied
      ? t('status.copied', { count: countLabel(list.length) })
      : t('status.copyFailed'),
    !copied
  );
  if (!copied) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    elements.commandPreview.scrollIntoView({
      block: 'center',
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }
}

async function shareSelection() {
  const list = selectedApps();
  if (list.length === 0) {
    return;
  }

  const copied = await copyText(shareUrlFor(list.map((app) => app.id)));
  showStatus(copied ? t('status.shareCopied') : t('status.shareFailed'), !copied);
}

function initializeSelection() {
  const hashSelection = readHashSelection();
  const storedSelection = readStoredSelection();
  const initialSelection = hashSelection ?? storedSelection ?? [];

  for (const id of initialSelection) {
    if (byId.has(id)) {
      selected.add(id);
    }
  }

  updateSelectionUI();

  if (initialSelection.length > 0) {
    syncUrl();
  }

  window.addEventListener('popstate', restoreSelectionFromUrl);
  window.addEventListener('hashchange', restoreSelectionFromUrl);
}

function initializeLanguage() {
  initI18n(elements.languageSelect);

  onLanguageChange(() => {
    elements.searchInput.placeholder = t('search.placeholder', { count: apps.length });
    elements.resultCount.textContent = countLabel(apps.length);

    for (const record of rowRecords) {
      const info = record.row.querySelector('.info-btn');
      if (info) {
        const label = t('details.aria', { name: record.app.name });
        info.setAttribute('aria-label', label);
        info.title = label;
      }

      const badge = record.row.querySelector('.app-badge');
      if (badge) {
        badge.textContent = t('dialog.preview');
      }
    }

    initializeFooter();
    updateSelectionUI();
    applyFilter();
  });
}

function initializeSupport() {
  elements.supportBtn.addEventListener('click', () => {
    window.clearTimeout(supportStatusTimer);
    elements.supportStatus.textContent = '';
    elements.supportStatus.classList.remove('is-error');
    elements.supportDialog.showModal();
    document.body.classList.add('dialog-open');
  });

  elements.supportClose.addEventListener('click', () => {
    elements.supportDialog.close();
  });

  elements.supportDialog.addEventListener('click', (event) => {
    if (event.target !== elements.supportDialog) {
      return;
    }

    const rect = elements.supportDialog.getBoundingClientRect();
    const clickedBackdrop =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedBackdrop) {
      elements.supportDialog.close();
    }
  });

  elements.supportDialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    window.clearTimeout(supportStatusTimer);
  });

  elements.supportDialog.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const code = document.getElementById(button.dataset.copy);
      if (!code) {
        return;
      }

      const copied = await copyText(code.textContent);
      elements.supportStatus.textContent = copied ? t('support.copied') : t('support.copyFailed');
      elements.supportStatus.classList.toggle('is-error', !copied);
      window.clearTimeout(supportStatusTimer);
      supportStatusTimer = window.setTimeout(() => {
        elements.supportStatus.textContent = '';
        elements.supportStatus.classList.remove('is-error');
      }, 4000);
    });
  });
}

function initializeFooter() {
  const meta = appData.meta || {};
  const verified = new Date(`${meta.verifiedOn || ''}T00:00:00Z`);
  const verifiedLabel = Number.isNaN(verified.getTime())
    ? meta.verifiedOn || t('footnote.unknown')
    : new Intl.DateTimeFormat(getLanguage(), {
        dateStyle: 'long',
        timeZone: 'UTC'
      }).format(verified);

  elements.catalogFootnote.textContent = t('footnote.text', {
    apps: apps.length,
    categories: categories.length,
    version: meta.wingetVersion || t('footnote.unknown'),
    date: verifiedLabel
  });
}

function initializeSearch() {
  elements.heroCount.textContent = String(apps.length);
  elements.searchInput.placeholder = t('search.placeholder', { count: apps.length });
  elements.resultCount.textContent = countLabel(apps.length);

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    elements.categorySelect.append(option);
  }

  elements.searchInput.addEventListener('input', applyFilter);
  elements.categorySelect.addEventListener('change', applyFilter);

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.categorySelect.value = '';
    applyFilter();
    elements.searchInput.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const target = event.target instanceof HTMLElement ? event.target : null;
    const isEditing =
      target && (target.matches('input, textarea, select') || target.isContentEditable);

    if (
      event.key === '/' &&
      !isEditing &&
      !elements.appDialog.open &&
      !elements.supportDialog.open
    ) {
      event.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
      return;
    }

    if (event.key === 'Escape' && document.activeElement === elements.searchInput) {
      if (elements.searchInput.value !== '') {
        elements.searchInput.value = '';
        applyFilter();
      } else {
        elements.searchInput.blur();
      }
    }
  });
}

function initializeSelectionEvents() {
  elements.categoryColumns.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('app-check')) {
      return;
    }
    setSelection(target.dataset.id, target.checked);
  });

  elements.categoryColumns.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target ? target.closest('.info-btn') : null;
    if (!button) {
      return;
    }

    const app = byId.get(button.dataset.id);
    if (app) {
      openDetails(app);
    }
  });

  elements.copyBtn.addEventListener('click', copyCommand);
  elements.shareBtn.addEventListener('click', shareSelection);
  elements.stickyCopyBtn.addEventListener('click', copyCommand);

  elements.appDialog.addEventListener('click', (event) => {
    if (event.target !== elements.appDialog) {
      return;
    }

    const rect = elements.appDialog.getBoundingClientRect();
    const clickedBackdrop =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedBackdrop) {
      elements.appDialog.close();
    }
  });

  elements.dialogClose.addEventListener('click', () => {
    elements.appDialog.close();
  });

  elements.appDialog.addEventListener('close', () => {
    activeDialogId = null;
    document.body.classList.remove('dialog-open');
    window.clearTimeout(dialogStatusTimer);
  });

  elements.dialogToggle.addEventListener('click', () => {
    if (!activeDialogId) {
      return;
    }
    setSelection(activeDialogId, !selected.has(activeDialogId));
  });

  elements.dialogCopyId.addEventListener('click', async () => {
    if (!activeDialogId) {
      return;
    }

    const app = byId.get(activeDialogId);
    if (!app) {
      return;
    }

    const copied = await copyText(app.id);
    elements.dialogCopyStatus.textContent = copied ? t('status.idCopied') : t('status.idCopyFailed');
    window.clearTimeout(dialogStatusTimer);
    dialogStatusTimer = window.setTimeout(() => {
      elements.dialogCopyStatus.textContent = '';
    }, 4000);
  });
}

function initializeInstallObserver() {
  if (!('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      installSectionVisible = entries.some((entry) => entry.isIntersecting);
      updateStickyBar();
    },
    { threshold: 0.05 }
  );

  observer.observe(elements.installSection);
}

initializeLanguage();
renderCatalog();
initializeSearch();
initializeSelectionEvents();
initializeSupport();
initializeInstallObserver();
initializeFooter();
initializeSelection();
applyFilter();
