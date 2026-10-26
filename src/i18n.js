import en from './locales/en.json';
import de from './locales/de.json';

const LOCALES = { en, de };
const STORAGE_KEY = 'openwin-lang-v1';
const DEFAULT_LANGUAGE = 'en';

const listeners = new Set();
let current = DEFAULT_LANGUAGE;

function readStoredLanguage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing or embedded views.
    return null;
  }
}

function detectLanguage() {
  const stored = readStoredLanguage();
  if (stored && LOCALES[stored]) {
    return stored;
  }

  const preferred = navigator.languages || [navigator.language];
  for (const tag of preferred) {
    if (!tag) {
      continue;
    }
    // Match full tags like "de-ch" first, then base languages like "de".
    const lower = String(tag).toLowerCase();
    const base = lower.split('-')[0];
    if (LOCALES[lower]) {
      return lower;
    }
    if (LOCALES[base]) {
      return base;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function getLanguage() {
  return current;
}

export function t(key, vars) {
  const value = LOCALES[current][key] ?? LOCALES[DEFAULT_LANGUAGE][key];
  if (value === undefined) {
    console.warn(`Missing translation key: ${key}`);
    return key;
  }

  if (!vars) {
    return value;
  }

  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function countLabel(count) {
  const form = new Intl.PluralRules(current).select(count);
  const formKey = `count.app.${form}`;
  if (LOCALES[current][formKey] !== undefined || LOCALES[DEFAULT_LANGUAGE][formKey] !== undefined) {
    return t(formKey, { count });
  }
  return t('count.app.other', { count });
}

function applyStaticTranslations() {
  document.documentElement.lang = current;

  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of document.querySelectorAll('[data-i18n-aria-label]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  }
}

export function onLanguageChange(listener) {
  listeners.add(listener);
}

export function setLanguage(code) {
  if (!LOCALES[code] || code === current) {
    return;
  }

  current = code;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage can be unavailable in private browsing or embedded views.
  }

  applyStaticTranslations();
  for (const listener of listeners) {
    listener();
  }
}

export function initI18n(languageSelect) {
  current = detectLanguage();
  applyStaticTranslations();

  if (languageSelect) {
    languageSelect.value = current;
    languageSelect.addEventListener('change', () => {
      setLanguage(languageSelect.value);
    });
  }
}
