import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = process.env.VITE_PROXY_API || 'http://127.0.0.1:8800'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      '/v1': { target: api, changeOrigin: true },
      '/health': { target: api, changeOrigin: true },
    },
  },
})
