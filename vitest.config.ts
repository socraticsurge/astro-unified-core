import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/.worktrees/**'],
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
