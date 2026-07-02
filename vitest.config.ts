import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config is kept separate from the library build (vite.config.ts) so the
// dts plugin and library bundling never run during tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    // The e2e suite is Playwright's, not Vitest's.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/test/**'],
      thresholds: {
        lines: 89,
        statements: 89,
        branches: 84,
        functions: 81,
      },
    },
  },
})
