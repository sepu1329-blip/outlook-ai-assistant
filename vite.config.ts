import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  // Base path for GitHub Pages
  base: '/outlook-ai-assistant/',
  server: {
    port: 3000,
    // https: true, // Handled by mkcert plugin
  },
})
