const SAFE_PACKAGE_ID = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const SOURCES = new Set(['winget', 'msstore']);

const WINGET_FLAGS = [
  '--exact',
  '--accept-package-agreements',
  '--accept-source-agreements',
  '--disable-interactivity'
];

function assertApp(app) {
  if (!app || typeof app.id !== 'string' || !SAFE_PACKAGE_ID.test(app.id)) {
    throw new TypeError(`Invalid package ID: ${app && app.id}`);
  }
  if (!SOURCES.has(app.source)) {
    throw new TypeError(`Invalid package source for ${app.id}`);
  }
}

export function buildInstallCommand(app) {
  assertApp(app);
  return `winget install --id "${app.id}" --source ${app.source} ${WINGET_FLAGS.join(' ')}`;
}

export function buildCommandText(apps) {
  return apps.map(buildInstallCommand).join('\n');
}
