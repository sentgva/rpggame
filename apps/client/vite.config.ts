import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// метка сборки для баг-репортов: коммит на Vercel или дата сборки
const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD__: JSON.stringify(BUILD),
  },
  resolve: {
    alias: {
      '@idle/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
          react: ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
});
