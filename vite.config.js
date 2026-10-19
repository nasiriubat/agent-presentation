import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_PUBLIC ? '/agent-presentation/' : '/',
  build: {
    rollupOptions: {
      input: { index: 'index.html', preflight: 'preflight.html' },
    },
  },
});
