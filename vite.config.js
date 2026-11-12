import { createLogger, defineConfig } from 'vite';

const logger = createLogger();
const warn = logger.warn;
logger.warn = (message, options) => {
  if (
    message.includes('theme-init.js') &&
    message.includes("can't be bundled without type=\"module\" attribute")
  ) {
    return;
  }

  warn(message, options);
};

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'"
].join('; ');

function contentSecurityPolicy() {
  return {
    name: 'openwin-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: CONTENT_SECURITY_POLICY
            },
            injectTo: 'head-prepend'
          }
        ]
      };
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: 'public',
  customLogger: logger,
  plugins: [contentSecurityPolicy()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: 'index.html',
        why: 'why.html',
        privacy: 'privacy.html',
        security: 'security.html',
        contact: 'contact.html',
        notFound: '404.html'
      }
    }
  }
});
