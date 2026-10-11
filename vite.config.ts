import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// The 3D book is split into its own chunk so phones never download three.js.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // No manual chunking: the lazy import of BookSite in App.tsx is the split
    // point, so three.js, R3F and GSAP land in the book's own chunks and the
    // paper version's entry never imports them.
    chunkSizeWarningLimit: 1400,
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
