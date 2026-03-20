import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const lsPath = fileURLToPath(new URL('./src/ls', import.meta.url));

// A web-friendly dev config (separate from the desktop app dev server ports).
export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      ls: lsPath,
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
