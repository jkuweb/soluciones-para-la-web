// Wrapper: loads .env, registers the CSS shim loader, then runs a script via tsx.
// This is needed because Payload's admin UI and custom components import
// .css files that don't work outside of Next.js's bundler, and Payload
// needs env vars (PAYLOAD_SECRET, DATABASE_URL) at init time.
//
// Usage:
//   node scripts/loaders/run-with-css.mjs scripts/create-client.ts
//   node scripts/loaders/run-with-css.mjs scripts/reset-admin-pw.ts

import 'dotenv/config'

import { register } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 1. Register the CSS shim loader FIRST, before any other loader (including tsx)
register('./css-shim-loader.mjs', import.meta.url)

// 2. Activate tsx so .ts imports work
await import('tsx/esm')

// 3. Run the target script
const targetArg = process.argv[2]
if (!targetArg) {
  console.error('Usage: node scripts/loaders/run-with-css.mjs <script-path>')
  process.exit(1)
}

const targetPath = resolve(process.cwd(), targetArg)
const mod = await import(targetPath)

if (typeof mod.run === 'function') {
  await mod.run()
} else {
  console.error(`Script ${targetArg} does not export a "run" function.`)
  process.exit(1)
}
