import { defineConfig } from 'vite';

// Dev-server only. On this drive (V:) the normal file watcher misses edits, so the dev
// server kept serving stale JS/CSS until restarted. Polling picks every save up.
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
