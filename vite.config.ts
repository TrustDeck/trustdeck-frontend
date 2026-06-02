import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const localKeyPath = path.resolve(__dirname, 'local-key.pem')
const localCertPath = path.resolve(__dirname, 'local-cert.pem')
const hasLocalHttpsCerts = fs.existsSync(localKeyPath) && fs.existsSync(localCertPath)

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@component': path.resolve(__dirname, 'src/core/components'),
      '@service': path.resolve(__dirname, 'src/core/services')
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
  }
}))
