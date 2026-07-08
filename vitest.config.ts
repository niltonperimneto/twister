import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/* Unit tests for the pure logic modules (keycode mapping, layout math).
 * Reuses the app's `$lib` alias. Components/Svelte runes are out of scope. */
export default defineConfig({
  resolve: {
    alias: {
      '$lib': resolve('./src/lib'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
