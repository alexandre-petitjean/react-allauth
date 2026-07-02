import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config is kept separate from the library build (vite.config.ts) so the
// dts plugin and library bundling never run during tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/test/**'],
      thresholds: {
        lines: 89,
        statements: 89,
      },
    },
  },
})
