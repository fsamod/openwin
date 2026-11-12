const STORAGE_KEY = 'openwin-theme-v1';
const root = document.documentElement;
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: light)');

function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (error) {
    return null;
  }
}

export function getTheme() {
  return root.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme, { persist = false } = {}) {
  const next = theme === 'light' ? 'light' : 'dark';
  root.dataset.theme = next;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', next === 'light' ? '#f6f8fb' : '#0b0d10');
  }

  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
    }
  }

  window.dispatchEvent(new CustomEvent('openwin:themechange', { detail: { theme: next } }));
  return next;
}

export function toggleTheme() {
  return applyTheme(getTheme() === 'light' ? 'dark' : 'light', { persist: true });
}

function initTheme() {
  const stored = readStoredTheme();
  applyTheme(stored ?? (colorSchemeQuery.matches ? 'light' : 'dark'));
}

colorSchemeQuery.addEventListener('change', (event) => {
  if (readStoredTheme() === null) {
    applyTheme(event.matches ? 'light' : 'dark');
  }
});

initTheme();

const toggleButton = document.querySelector('#themeToggle');

function syncToggleButton() {
  if (!toggleButton) {
    return;
  }

  const label = getTheme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  toggleButton.setAttribute('aria-label', label);
  toggleButton.setAttribute('title', label);
}

if (toggleButton) {
  toggleButton.addEventListener('click', toggleTheme);
  window.addEventListener('openwin:themechange', syncToggleButton);
  syncToggleButton();
}
