import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createWebPreviewProxyPlugin } from './vite.preview-proxy';

export default defineConfig({
  plugins: [react(), createWebPreviewProxyPlugin()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    hmr: {
      port: 1421,
    },
  },
});
