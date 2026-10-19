import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve el sitio en /churri-doku/
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 1200 },
});
