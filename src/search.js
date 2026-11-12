export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function tokenize(query) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

export function buildSearchText(app, categoryName) {
  return normalize(
    [
      app.name,
      app.publisher,
      app.id,
      app.description,
      categoryName,
      app.source === 'msstore' ? 'microsoft store msstore' : 'winget',
      app.preview ? 'beta preview' : ''
    ].join(' ')
  );
}

export function matchesQuery(searchText, tokens) {
  return tokens.every((token) => searchText.includes(token));
}
