import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/eslint-plugin/vitest.config.ts',
  'packages/hooks/vitest.config.ts',
])
