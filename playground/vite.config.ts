import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only playground. It consumes the library through its package name so it
// behaves like a real consumer, while the alias points at the live source for
// instant HMR when editing `src/*`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-allauth': resolve(import.meta.dirname, '../src/index.ts'),
    },
  },
  // Proxy the headless API to the local backend so the app talks to it
  // same-origin: no CORS, and cookies + CSRF work as in a real deployment.
  // The port is fixed so the origin is stable for the backend's CSRF trust list.
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/_allauth': 'http://localhost:8000',
    },
  },
})
