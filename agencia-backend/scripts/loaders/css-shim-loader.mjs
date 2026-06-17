// CSS shim loader — intercepts .css imports and returns an empty module.
// Needed because Payload's admin UI and some custom components import CSS
// files that don't work outside of Next.js's bundler.
//
// Usage:
//   node --import ./scripts/loaders/css-shim-loader.mjs ./node_modules/.bin/tsx scripts/foo.ts
//   pnpm exec tsx --import ./scripts/loaders/css-shim-loader.mjs scripts/foo.ts

const EMPTY_MODULE_SOURCE = 'export default {};'
const EMPTY_MODULE_URL = `data:text/javascript;base64,${Buffer.from(EMPTY_MODULE_SOURCE).toString('base64')}`

export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return {
      url: EMPTY_MODULE_URL,
      shortCircuit: true,
      format: 'module',
    }
  }
  return nextResolve(specifier, context)
}
