import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte(), tailwindcss()],

  resolve: {
    alias: {
      '$lib': resolve('./src/lib'),
    },
  },

  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
  },

  build: {
    outDir: 'build',
    target: ['es2021', 'chrome100', 'safari15'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
