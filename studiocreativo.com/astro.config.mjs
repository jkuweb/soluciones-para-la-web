import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // El tenant slug se configura en .env
  // Las páginas se generan estáticamente desde Payload
})
