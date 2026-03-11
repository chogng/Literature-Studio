import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createWebPreviewProxyPlugin } from './vite.preview-proxy';

// A web-friendly dev config (separate from the desktop app dev server ports).
export default defineConfig({
  plugins: [react(), createWebPreviewProxyPlugin()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: false,
  },
});
