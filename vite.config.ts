import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@component": path.resolve(__dirname, "src/core/components"),
      "@service": path.resolve(__dirname, "src/core/services")
    }
  },
  server: {
    https: {
      key: fs.readFileSync('local-key.pem'),
      cert: fs.readFileSync('local-cert.pem')
    },
    host: 'localhost',
    port: 5173
  }
})
