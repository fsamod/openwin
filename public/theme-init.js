(function () {
  var STORAGE_KEY = 'openwin-theme-v1';
  var root = document.documentElement;
  var theme = null;

  try {
    var stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
  } catch (error) {
  }

  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  root.dataset.theme = theme;

  function updateThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f6f8fb' : '#0b0d10');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateThemeColor);
  } else {
    updateThemeColor();
  }
})();
