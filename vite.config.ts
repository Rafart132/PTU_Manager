import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative assets work both in /PTU_Manager/ and under a custom domain.
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  preview: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  build: { outDir: 'dist' },
});
