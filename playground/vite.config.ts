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
})
