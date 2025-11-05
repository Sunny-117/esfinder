import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/example/**',
      '**/.{idea,git,cache,output,temp}/**'
    ]
  }
})