import path from 'node:path'
import fs from 'node:fs'
import { syncTemplate, detectTemplateType, type SyncOptions, type FrontendType } from './sync-template.js'
import { listClientSlugs } from './audit-clients.js'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export type SyncAllOptions = {
  apply: boolean
  filter: 'all' | 'outdated'
  template?: FrontendType
}

export type ClientSyncStatus =
  | { slug: string; status: 'updated'; template: FrontendType; filesChanged: number; filesAdded: number }
  | { slug: string; status: 'skipped'; reason: 'up-to-date' }
  | { slug: string; status: 'error'; reason: string }

export type SyncAllResult = {
  total: number
  updated: number
  skipped: number
  errors: number
  clients: ClientSyncStatus[]
}

const USAGE =
  'Usage: pnpm sync:clients [--apply] [--filter=outdated] [--template=astro|nextjs]'

export const parseSyncAllArgs = (args: string[]): SyncAllOptions => {
  let apply = false
  let filter: 'all' | 'outdated' = 'all'
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

  const options: SyncAllOptions = { apply, filter }
  if (template !== undefined) options.template = template
  return options
}

export const syncOneClient = async (
  slug: string,
  options: SyncAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<ClientSyncStatus> => {
  const clientDir = path.join(clientDirBase, slug)
  if (!fs.existsSync(clientDir)) {
    return { slug, status: 'error', reason: `Client directory does not exist: ${clientDir}` }
  }
  let templateType: FrontendType
  try {
    templateType = options.template ?? (await detectTemplateType(clientDir))
  } catch (err) {
    return { slug, status: 'error', reason: (err as Error).message }
  }

  try {
    const syncOpts: SyncOptions = {
      slug,
      apply: options.apply,
      verbose: false,
      template: templateType,
      clientDirOverride: clientDir,
    }
    const result = await syncTemplate(syncOpts)
    const hasChanges = result.updated + result.added > 0
    if (!hasChanges) {
      return { slug, status: 'skipped', reason: 'up-to-date' }
    }
    return {
      slug,
      status: 'updated',
      template: templateType,
      filesChanged: result.updated,
      filesAdded: result.added,
    }
  } catch (err) {
    return { slug, status: 'error', reason: (err as Error).message }
  }
}
