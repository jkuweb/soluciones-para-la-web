import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

// https://astro.build/config
// comentario destacable
// `hybrid` allows individual routes to opt out of static generation with
// `export const prerender = false`. The `preview` route needs SSR to fetch
// drafts from Payload at request time. The @astrojs/node adapter (standalone
// mode) is configured here so both dev and build work locally. For production
// deploys on Vercel, Netlify, or other platforms, swap the adapter
// (e.g. @astrojs/vercel, @astrojs/netlify) as needed.
export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  // El tenant slug se configura en .env
  // Las páginas se generan estáticamente desde Payload
})
