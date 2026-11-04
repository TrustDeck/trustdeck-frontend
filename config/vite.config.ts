import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const projectRoot = path.resolve(__dirname, '..')
const localKeyPath = path.resolve(projectRoot, 'local-key.pem')
const localCertPath = path.resolve(projectRoot, 'local-cert.pem')
const hasLocalHttpsCerts = fs.existsSync(localKeyPath) && fs.existsSync(localCertPath)

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@component': path.resolve(projectRoot, 'src/core/components'),
      '@service': path.resolve(projectRoot, 'src/core/services')
    }
  },
  server: {
    https:
      command === 'serve' && hasLocalHttpsCerts
        ? {
            key: fs.readFileSync(localKeyPath),
            cert: fs.readFileSync(localCertPath)
          }
        : undefined,
    host: 'localhost',
    port: 5173
  },
  build: {
    rolldownOptions: {
      // The silent renew page is loaded in a hidden iframe and needs its own bundle.
      input: {
        main: path.resolve(projectRoot, 'index.html'),
        silentRenew: path.resolve(projectRoot, 'silent-renew.html')
      }
    }
  },
  css: {
    postcss: path.resolve(__dirname)
  }
}))
