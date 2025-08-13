import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})