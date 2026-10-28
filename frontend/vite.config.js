import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../backend/static'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/kb': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/generate': 'http://localhost:8000',
      '/approve': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    },
  },
});
