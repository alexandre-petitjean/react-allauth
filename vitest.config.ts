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
      // Baselines re-measured under Vitest 4's AST-based v8 remapping, which
      // counts lines/branches more strictly than Vitest 3 did.
      thresholds: {
        lines: 86,
        statements: 85,
        branches: 75,
        functions: 78,
      },
    },
  },
})
