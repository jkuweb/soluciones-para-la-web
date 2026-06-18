import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import {
  readPackageJson,
  mergePackageJson,
  type PackageJson,
} from './update-deps.js'
import { listClientSlugs } from './audit-clients.js'
import {
  getClientDir,
  getTemplateDir,
  detectTemplateType,
  type FrontendType,
} from './sync-template.js'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export type UpdateAllOptions = {
  apply: boolean
  filter: 'all' | 'outdated'
  skipInstall: boolean
  template?: FrontendType
}

export type ClientUpdateStatus =
  | { slug: string; status: 'updated'; template: FrontendType; added: number; updated: number; installed: boolean }
  | { slug: string; status: 'skipped'; reason: 'up-to-date' }
  | { slug: string; status: 'error'; reason: string }

export type UpdateAllResult = {
  total: number
  updated: number
  skipped: number
  errors: number
  clients: ClientUpdateStatus[]
}

const USAGE =
  'Usage: pnpm update:clients [--apply] [--filter=outdated] [--template=astro|nextjs] [--skip-install]'

export const parseUpdateAllArgs = (args: string[]): UpdateAllOptions => {
  let apply = false
  let filter: 'all' | 'outdated' = 'all'
  let skipInstall = false
  let template: FrontendType | undefined

  for (const arg of args) {
    if (arg === '--apply') {
      apply = true
    } else if (arg.startsWith('--filter=')) {
      const value = arg.slice('--filter='.length)
      if (value !== 'all' && value !== 'outdated') {
        throw new Error(`Invalid --filter value: ${value}. Use "all" or "outdated".`)
      }
      filter = value
    } else if (arg === '--skip-install') {
      skipInstall = true
    } else if (arg.startsWith('--template=')) {
      const value = arg.slice('--template='.length)
      if (value !== 'astro' && value !== 'nextjs') {
        throw new Error(`Invalid --template value: ${value}. Use "astro" or "nextjs".`)
      }
      template = value
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('HELP')
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  const options: UpdateAllOptions = { apply, filter, skipInstall }
  if (template !== undefined) options.template = template
  return options
}

// Re-export for tests
export { detectTemplateType }
