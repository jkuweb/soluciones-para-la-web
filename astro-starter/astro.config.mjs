import { defineConfig } from 'astro/config'

// https://astro.build/config
// comentario destacable
// `hybrid` allows individual routes to opt out of static generation with
// `export const prerender = false`. The `preview` route needs SSR to fetch
// drafts from Payload at request time. For production deploys, an Astro
// adapter (@astrojs/vercel, @astrojs/netlify, ...) must be installed or
// the SSR routes will not be served. Local dev works without an adapter.
export default defineConfig({
  output: 'hybrid',
  // El tenant slug se configura en .env
  // Las páginas se generan estáticamente desde Payload
})
