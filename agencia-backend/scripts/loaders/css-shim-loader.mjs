// CSS shim loader — intercepts .css imports and returns an empty module.
// Needed because Payload's admin UI and some custom components import CSS
// files that don't work outside of Next.js's bundler.
//
// Usage:
//   node --import ./scripts/loaders/css-shim-loader.mjs ./node_modules/.bin/tsx scripts/foo.ts
//   pnpm exec tsx --import ./scripts/loaders/css-shim-loader.mjs scripts/foo.ts

const EMPTY_MODULE_SOURCE = 'export default {};'

export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return {
      url: 'data:text/javascript,export default {};',
      shortCircuit: true,
      format: 'module',
    }
  }
  return nextResolve(specifier, context)
}

export function load(url, context, nextLoad) {
  // Some bundlers (e.g. tsx) append ?tsx-namespace=... to data: URLs and
  // then fail to parse them. Strip the suffix so any data: URL we return
  // is treated as a plain JS module.
  if (url.startsWith('data:text/javascript')) {
    return {
      format: 'module',
      source: EMPTY_MODULE_SOURCE,
      shortCircuit: true,
    }
  }
  return nextLoad(url, context)
}
