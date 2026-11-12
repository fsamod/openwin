export function buildAppsHash(ids) {
  return ids.length > 0 ? `apps=${ids.join(',')}` : '';
}

export function parseAppsHash(hash, isKnownId) {
  const value = String(hash || '').replace(/^#/, '');
  if (!value) {
    return null;
  }

  const part = value
    .split('&')
    .find((item) => item === 'apps' || item.startsWith('apps='));

  if (!part) {
    return null;
  }

  return part
    .slice('apps='.length)
    .split(',')
    .map((id) => {
      try {
        return decodeURIComponent(id.trim());
      } catch {
        return '';
      }
    })
    .filter((id) => id !== '' && isKnownId(id));
}
