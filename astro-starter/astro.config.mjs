import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

// https://astro.build/config
// comentario destacable
// Astro 5 removed `output: 'hybrid'`. The new `output: 'static'` (default)
// already supports per-route `export const prerender = false`, which the
// `preview` route uses to fetch drafts from Payload at request time. The
// @astrojs/node adapter (standalone mode) is configured here so both dev
// and build work locally. For production deploys on Vercel, Netlify, or
// other platforms, swap the adapter (e.g. @astrojs/vercel, @astrojs/netlify)
// as needed.
export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  // El tenant slug se configura en .env
  // Las páginas se generan estáticamente desde Payload
})
