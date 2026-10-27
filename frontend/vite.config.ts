import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend that the dev/preview servers proxy API calls to.
const backend = process.env.VITE_BACKEND_PROXY || 'http://127.0.0.1:5000'

// Same-origin proxy: the browser only talks to the Vite server, which forwards
// API, media and Socket.IO requests to the Flask backend. This avoids CORS
// entirely (and the Daytona preview proxy's duplicate CORS headers).
const proxy = {
  '/api': { target: backend, changeOrigin: true },
  '/mock': { target: backend, changeOrigin: true },
  '/health': { target: backend, changeOrigin: true },
  '/socket.io': { target: backend, changeOrigin: true, ws: true },
}

// Allow the Daytona preview proxy host.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
    proxy,
  },
})
