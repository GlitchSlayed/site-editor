import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
    watch: {
      ignored: ['**/build-dir/**', '**/.flatpak-builder/**', '**/repo/**', '**/src-tauri/target/**', '**/target/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: { target: 'es2022' },
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'build-dir/**', '.flatpak-builder/**', 'repo/**'],
  },
});
