import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const lsPath = fileURLToPath(new URL('./src/ls', import.meta.url));
const webIndexPath = fileURLToPath(new URL('./index.html', import.meta.url));

// Web mode serves the root index directly so `vite` dev opens at `/`
// instead of requiring the nested Electron workbench HTML path.
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
  build: {
    rollupOptions: {
      input: {
        index: webIndexPath,
      },
    },
  },
});
