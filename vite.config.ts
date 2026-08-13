import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative base so the built site works from any sub-path (GitHub Pages,
  // a folder on a school server) without a rebuild.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
  },
  test: {
    // Every unit test in this project is pure computation — no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
