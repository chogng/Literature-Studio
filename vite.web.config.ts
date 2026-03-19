import { defineConfig } from 'vite';

// A web-friendly dev config (separate from the desktop app dev server ports).
export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: false,
  },
});
