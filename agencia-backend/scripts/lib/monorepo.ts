import path from 'node:path'

// Single source of truth for the monorepo root, used by every script that
// needs to know where the agencia workspace lives. Kept in its own module
// to avoid circular imports: add-feature.ts re-exports these for legacy
// callers, and features install.ts files import directly from here.
export const MONOREPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, '../../../')
export const FEATURES_DIR = path.join(MONOREPO_ROOT, 'agencia-backend/scripts/features')
export const TEMPLATES_DIR = MONOREPO_ROOT
