import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  envDir: 'tests',
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/sql/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
