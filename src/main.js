import appData from './data/apps.json';
import { buildCommandText } from './install-commands.js';

const ICON_BASE = import.meta.env.BASE_URL || './';
const STORAGE_KEY = 'openwin-selection-v1';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

const categoryIds = new Set(appData.categories.map((category) => category.id));
const apps = appData.apps.filter((app) => {
  const isValid =
    app &&
    typeof app.id === 'string' &&
    SAFE_ID.test(app.id) &&
    typeof app.name === 'string' &&
    categoryIds.has(app.category) &&
    (app.source === 'winget' || app.source === 'msstore');

  if (!isValid) {
    console.warn('Skipping invalid catalog entry:', app);
  }

  return isValid;
});

const byId = new Map(apps.map((app) => [app.id, app]));
const categoryNames = new Map(appData.categories.map((category) => [category.id, category.name]));

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

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'info-btn';
  info.dataset.id = app.id;
  info.setAttribute('aria-label', `Details for ${app.name}`);
  info.title = `Details for ${app.name}`;

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
  for (const category of appData.categories) {
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
      section,
      count,
      total: categoryApps.length,
      records: []
    };

    categoryApps.forEach((app) => {
      const row = createAppRow(app, rowRecords.length);
      const haystack = normalize(
        [app.name, app.publisher, app.id, category.name, app.source].join(' ')
      );
      const record = { row, app, haystack };

      list.append(row);
      rowRecords.push(record);
      state.records.push(record);
    });

    section.append(heading, list);
    elements.categoryColumns.append(section);
    categoryStates.push(state);
  }
}

function appCountLabel(count) {
  return `${count} ${count === 1 ? 'app' : 'apps'}`;
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
    // Storage can be unavailable in private browsing or embedded views.
  }
}

function shareUrlFor(ids) {
  const url = new URL(window.location.href);
  url.hash = ids.length > 0 ? `apps=${encodeURIComponent(ids.join(','))}` : '';
  return url.toString();
}

function syncUrl() {
  try {
    window.history.replaceState(null, '', shareUrlFor(selectedApps().map((app) => app.id)));
  } catch {
    // Ignore history restrictions, for example when opened from a local file.
  }
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
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  if (!params.has('apps')) {
    return null;
  }

  return (params.get('apps') || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => byId.has(id));
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
  elements.dialogToggle.textContent = isSelected ? 'Remove from selection' : 'Add to selection';
  elements.dialogToggle.classList.toggle('button-primary', !isSelected);
  elements.dialogToggle.classList.toggle('button-secondary', isSelected);
}

function updateSelectionUI() {
  const list = selectedApps();
  const count = list.length;
  const label = appCountLabel(count);

  for (const [id, checkbox] of checkboxById) {
    const isSelected = selected.has(id);
    checkbox.checked = isSelected;
    const row = checkbox.closest('.app-row');
    if (row) {
      row.classList.toggle('is-selected', isSelected);
    }
  }

  elements.installSummary.textContent =
    count === 0 ? 'Pick at least one app above.' : `${label} selected. Ready to copy your commands.`;
  elements.copyBtn.disabled = count === 0;
  elements.shareBtn.disabled = count === 0;
  elements.stickyCount.textContent = label;
  elements.previewCount.textContent = count === 0 ? '' : label;

  elements.commandPreview.textContent =
    count === 0
      ? '# Select at least one app to show its commands.'
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
  const query = normalize(elements.searchInput.value.trim());
  let matches = 0;

  for (const state of categoryStates) {
    let categoryMatches = 0;

    for (const record of state.records) {
      const isMatch = query === '' || record.haystack.includes(query);
      record.row.hidden = !isMatch;
      if (isMatch) {
        categoryMatches += 1;
      }
    }

    state.section.hidden = categoryMatches === 0;
    state.count.textContent =
      query === '' ? String(state.total) : `${categoryMatches}/${state.total}`;
    matches += categoryMatches;
  }

  elements.emptyState.hidden = matches !== 0;
  elements.emptyMessage.textContent =
    query === '' ? 'No apps match your search.' : `No apps match "${elements.searchInput.value.trim()}".`;
  elements.resultCount.textContent =
    query === '' ? appCountLabel(apps.length) : `${matches} of ${apps.length} apps`;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function openDetails(app) {
  activeDialogId = app.id;
  window.clearTimeout(dialogStatusTimer);
  elements.dialogCopyStatus.textContent = '';
  elements.dialogIcon.replaceChildren(createIcon(app, 'dialog-icon-wrap'));
  elements.dialogName.textContent = app.name;
  elements.dialogPublisher.textContent = app.publisher || 'Unknown publisher';
  elements.dialogSource.textContent =
    app.source === 'msstore' ? 'Microsoft Store package' : 'winget package';
  elements.dialogSource.classList.toggle('is-store', app.source === 'msstore');
  elements.dialogDesc.textContent = app.description;
  elements.dialogId.textContent = app.id;
  elements.dialogCategory.textContent = categoryNames.get(app.category) || app.category;

  const homepage = safeHttpUrl(app.homepage);
  elements.dialogHomeRow.hidden = !homepage;
  if (homepage) {
    elements.dialogHome.href = homepage;
    elements.dialogHome.textContent = 'Visit homepage';
  }

  updateDialogToggle();
  elements.appDialog.showModal();
  document.body.classList.add('dialog-open');
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback.
    }
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  area.remove();
  return copied;
}

async function copyCommand() {
  const list = selectedApps();
  if (list.length === 0) {
    return;
  }

  const copied = await copyText(buildCommandText(list));
  showStatus(
    copied
      ? `Copied commands for ${appCountLabel(list.length)}.`
      : 'Could not copy automatically. Select the commands in the block instead.',
    !copied
  );
  if (!copied) {
    elements.commandPreview.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

async function shareSelection() {
  const list = selectedApps();
  if (list.length === 0) {
    return;
  }

  const copied = await copyText(shareUrlFor(list.map((app) => app.id)));
  showStatus(
    copied ? 'Share link copied.' : 'Could not copy the link. Copy the address bar instead.',
    !copied
  );
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

  window.addEventListener('hashchange', () => {
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
      elements.supportStatus.textContent = copied
        ? 'Address copied. Thank you!'
        : 'Could not copy. Select the address manually.';
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
  const verified = new Date(`${appData.meta.verifiedOn}T00:00:00Z`);
  const verifiedLabel = Number.isNaN(verified.getTime())
    ? appData.meta.verifiedOn
    : new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeZone: 'UTC'
      }).format(verified);

  elements.catalogFootnote.textContent =
    `${apps.length} apps in ${appData.categories.length} categories. Package IDs checked against ` +
    `winget ${appData.meta.wingetVersion} on ${verifiedLabel}. This is a fixed catalog, not a live ` +
    'mirror of winget.';
}

function initializeSearch() {
  elements.heroCount.textContent = String(apps.length);
  elements.searchInput.placeholder = `Search ${apps.length} apps or publishers`;
  elements.resultCount.textContent = appCountLabel(apps.length);

  elements.searchInput.addEventListener('input', applyFilter);

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
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

    if (event.key === '/' && !isEditing && !elements.appDialog.open) {
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
    const copied = await copyText(app.id);
    elements.dialogCopyStatus.textContent = copied
      ? 'Package ID copied.'
      : 'Could not copy the package ID.';
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

renderCatalog();
initializeSearch();
initializeSelectionEvents();
initializeSupport();
initializeInstallObserver();
initializeFooter();
initializeSelection();
applyFilter();
