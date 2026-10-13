import { defineConfig } from 'vite';

// relative paths for GitHub Pages project sites
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
