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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('@react-three') || id.includes('gsap')) return 'three'
        },
      },
    },
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
