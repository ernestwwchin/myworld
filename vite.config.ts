import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: './',
  plugins: [
    svelte({
      // Only compile .svelte files under src/editor/ — game code untouched
      compilerOptions: { css: 'injected' },
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
    headers: { 'Cache-Control': 'no-store' },
  },
  preview: {
    port: 3100,
    strictPort: true,
    headers: { 'Cache-Control': 'no-store' },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        test: resolve(__dirname, 'test.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/js-yaml')) return 'yaml';
        },
      },
    },
  },
});
