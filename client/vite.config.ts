import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/otp': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  base: './',
  build: {
    outDir: 'output',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  // @ts-ignore
  test: {
    environment: 'jsdom',
  },
});
