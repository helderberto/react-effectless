import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { baseCoverage } from '../../vitest.config.base'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      ...baseCoverage,
      exclude: [...(baseCoverage.exclude as string[]), 'dist/**', 'vite.config.ts', '__tests__/**'],
    },
  },
})
