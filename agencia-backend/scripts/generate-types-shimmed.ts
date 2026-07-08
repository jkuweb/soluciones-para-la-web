/**
 * Ad-hoc script to run `payload generate:types` outside of Next.js's bundler.
 *
 * Used when the standard `pnpm payload generate:types` fails because a transitive
 * dependency (e.g. react-image-crop) imports a .css file that Node 24 cannot
 * resolve natively. This script is run via `run-with-css.mjs`, which registers
 * the CSS shim loader before tsx is loaded.
 */
import config from '@/payload.config'
import { generateTypes } from 'payload/node'

export async function run(): Promise<void> {
  const resolved = await config
  await generateTypes(resolved, { log: true })
}
