import { defineConfig } from 'vite';

// Use relative asset paths so the build works on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) as well as custom domains.
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
