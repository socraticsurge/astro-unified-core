import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // tests/playwright/ holds @playwright/test specs. Excluding so
    // vitest doesn't try to interpret them — they're run via
    // `npm run test:e2e`.
    exclude: ['**/node_modules/**', '**/.worktrees/**', 'tests/playwright/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 60,
        branches: 60,
      },
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'docs/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
