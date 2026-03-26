import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    target: 'node18',
    rollupOptions: {
      external: ['eslint'],
    },
  },
  plugins: [dts({ rollupTypes: true })],
})
