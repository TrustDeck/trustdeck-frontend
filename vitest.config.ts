import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Same aliases as config/vite.config.ts, so tests can import modules that use them
  resolve: {
    alias: {
      '@component': path.resolve(__dirname, 'src/core/components'),
      '@service': path.resolve(__dirname, 'src/core/services')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
