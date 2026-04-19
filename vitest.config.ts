import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    globals: false,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/unit/sandbox/**/*.test.ts', 'jsdom'],
    ],
    include: ['tests/unit/**/*.test.ts'],
  },
});
