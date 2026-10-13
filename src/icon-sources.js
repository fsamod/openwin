const GENERIC_HOSTS = new Set([
  'github.com',
  'gist.github.com',
  'raw.githubusercontent.com',
  'mifi.github.io',
  'gitlab.com',
  'sourceforge.net',
  'www.sourceforge.net',
  'sourceforge.com',
  'learn.microsoft.com',
  'support.microsoft.com',
  'help.okta.com',
  'www.gnu.org',
  'gnu.org',
  'www.apache.org',
  'apache.org',
  'kde.org',
  'www.kde.org',
  'apps.microsoft.com',
  'aka.ms',
  'img.youtube.com'
]);

const GENERIC_HOST_PATTERNS = [
  /(^|\.)microsoft\.com$/,
  /(^|\.)windows\.com$/,
  /(^|\.)windowsupdate\.com$/,
  /(^|\.)apple\.com$/,
  /(^|\.)mozilla\.org$/,
  /(^|\.)sony\.[a-z.]+$/,
  /(^|\.)samsung\.com$/,
  /(^|\.)adobe\.com$/,
  /(^|\.)nvidia\.com$/
];

export function isGenericHost(host) {
  if (!host) return true;
  return GENERIC_HOSTS.has(host) || GENERIC_HOST_PATTERNS.some((re) => re.test(host));
}