import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const lsPath = fileURLToPath(new URL('./src/ls', import.meta.url));

export default defineConfig({
  clearScreen: false,
  resolve: {
    alias: {
      ls: lsPath,
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    hmr: {
      port: 1421,
    },
  },
});
