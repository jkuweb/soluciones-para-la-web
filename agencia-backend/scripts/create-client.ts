import path from 'node:path'

// --- Constants ---
export const MONOREPO_ROOT = path.resolve(__dirname, '../../')
export const TEMPLATES_DIR = MONOREPO_ROOT
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export const SLUG_REGEX = /^[a-z0-9-]+$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// --- Pure validation utilities ---
export const isValidSlug = (slug: string): boolean =>
  typeof slug === 'string' && slug.length > 0 && SLUG_REGEX.test(slug)

export const isValidEmail = (email: string): boolean =>
  typeof email === 'string' && email.length > 0 && EMAIL_REGEX.test(email)
