import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@diffchecker/wasm': path.resolve(__dirname, mode === 'desktop'
        ? 'src/platform/desktopWasm.ts'
        : 'src/platform/wasm/diffchecker_engine.js'),
    },
  },
  base: './',
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}))
