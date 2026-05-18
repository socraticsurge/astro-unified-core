import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/.worktrees/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
