import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    css: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
    include: ['tests/int/**/*.int.spec.ts', 'tests/unit/**/*.spec.ts'],
    // Disable file-level parallelism to avoid race conditions in
    // Payload's pushDevSchema. Each test file's beforeAll calls
    // getPayload() which triggers ALTER TABLE statements to sync the
    // schema. With parallel workers, multiple workers compete to
    // drop the same constraints, causing 42704 "constraint does not
    // exist" errors. The cascade also produces 53300 "too many
    // clients" from PostgreSQL. Sequential execution guarantees one
    // getPayload() at a time.
    fileParallelism: false,
    server: {
      deps: {
        inline: ['@payloadcms/ui'],
      },
    },
  },
})
