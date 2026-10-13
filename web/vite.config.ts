import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        introduzione: resolve(import.meta.dirname, 'introduzione.html'),
        ottimizzazione: resolve(import.meta.dirname, 'ottimizzazione.html'),
        kkt: resolve(import.meta.dirname, 'kkt.html'),
      },
      output: {
        manualChunks: {
          plotly: ['plotly.js-dist-min'],
          katex: ['katex'],
        },
      },
    },
    chunkSizeWarningLimit: 5000,
  },
});
