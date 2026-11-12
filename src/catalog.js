export const SAFE_PACKAGE_ID = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
export const SAFE_ICON_PATH = /^icons\/[A-Za-z0-9][A-Za-z0-9._+-]*\.(?:png|jpe?g|svg|ico)$/i;
export const SOURCES = new Set(['winget', 'msstore']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidApp(app, categoryIds) {
  return Boolean(
    app &&
      isNonEmptyString(app.id) &&
      SAFE_PACKAGE_ID.test(app.id) &&
      isNonEmptyString(app.name) &&
      isNonEmptyString(app.publisher) &&
      isNonEmptyString(app.description) &&
      typeof app.homepage === 'string' &&
      typeof app.icon === 'string' &&
      SAFE_ICON_PATH.test(app.icon) &&
      categoryIds.has(app.category) &&
      SOURCES.has(app.source) &&
      (app.preview === undefined || typeof app.preview === 'boolean')
  );
}

export function isSafeHttpUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
