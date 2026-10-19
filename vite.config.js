import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_PUBLIC ? '/agent-presentation/' : '/',
  build: {
    chunkSizeWarningLimit: 700, // three.js, lazy-loaded only in the deck view
    rollupOptions: {
      input: { index: 'index.html', preflight: 'preflight.html' },
    },
  },
});
