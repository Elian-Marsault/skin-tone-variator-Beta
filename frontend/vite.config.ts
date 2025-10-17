import { defineConfig } from 'vite';

export default defineConfig({
  base: '/skin-tone-variator/',
  server: {
    port: 4000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
