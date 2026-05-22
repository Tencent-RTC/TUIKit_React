import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    // Compile-time flag for demo-only debug capabilities (e.g. stream-type
    // toast triggered by consecutive header clicks). Set to `true` when
    // building debug artifacts via `DEBUG_MODE=true pnpm build`. Dead-code
    // eliminated in normal production builds.
    __DEBUG_MODE__: JSON.stringify(process.env.DEBUG_MODE === 'true'),
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
});
