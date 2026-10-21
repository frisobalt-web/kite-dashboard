import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kite-dashboard/',
  build: { outDir: 'dist', target: 'es2020' },
  test: { environment: 'node' }
} as never);
