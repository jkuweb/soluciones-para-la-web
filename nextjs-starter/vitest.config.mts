import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      payload: resolve(__dirname, 'tests/stubs/payload.ts'),
      '@payload-config': resolve(__dirname, 'tests/stubs/payload-config.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
    include: ['tests/int/**/*.int.spec.ts', 'tests/int/**/*.int.spec.tsx'],
  },
})
