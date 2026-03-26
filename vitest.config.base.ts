import type { CoverageOptions } from 'vitest/node'

export const baseCoverage: CoverageOptions = {
  provider: 'v8',
  reporter: ['lcov', 'text'],
  exclude: ['src/index.ts', 'src/types/**', '*.config.ts'],
  thresholds: {
    statements: 85,
    functions: 90,
    branches: 75,
    lines: 85,
  },
}
