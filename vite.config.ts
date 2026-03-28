import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const lsPath = fileURLToPath(new URL('./src/ls', import.meta.url));
const workbenchHtmlPath = fileURLToPath(
  new URL('./src/ls/code/electron-sandbox/workbench/workbench.html', import.meta.url),
);

export default defineConfig({
  base: './',
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
  build: {
    rollupOptions: {
      input: {
        workbench: workbenchHtmlPath,
      },
    },
  },
});
