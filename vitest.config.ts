import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  // Same build-time constants as config/vite.config.ts
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
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
