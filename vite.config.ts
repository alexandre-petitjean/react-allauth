import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

// https://vite.dev/guide/build#library-mode
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      compilerOptions: { rootDir: 'src' },
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    rolldownOptions: {
      // React (peer) and runtime deps must be provided by the consumer.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@simplewebauthn/browser',
      ],
    },
  },
})
