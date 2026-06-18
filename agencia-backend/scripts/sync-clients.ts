import path from 'node:path'
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
  let templateType: FrontendType
  try {
    templateType = options.template ?? (await detectTemplateType(clientDir))
  } catch (err) {
    return { slug, status: 'error', reason: err instanceof Error ? err.message : String(err) }
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
    return { slug, status: 'error', reason: err instanceof Error ? err.message : String(err) }
  }
}

const pad = (s: string, n: number): string => s.padEnd(n).slice(0, n)

export const formatSyncAllSummary = (result: SyncAllResult): string[] => {
  const headers = ['Client', 'Template', 'Files', 'Status']
  const widths = [16, 10, 10, 40]
  const rows: string[][] = result.clients.map((c) => {
    if (c.status === 'updated') {
      return [c.slug, c.template, `${c.filesChanged}c+${c.filesAdded}a`, 'updated']
    }
    if (c.status === 'skipped') {
      return [c.slug, '-', '-', 'skipped (up-to-date)']
    }
    return [c.slug, '-', '-', `error: ${c.reason}`]
  })
  const lines: string[] = []
  lines.push(headers.map((h, i) => pad(h, widths[i])).join('  '))
  lines.push(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of rows) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join('  '))
  }
  lines.push('')
  lines.push(
    `Total: ${result.total} | Updated: ${result.updated} | Skipped: ${result.skipped} | Errors: ${result.errors}`,
  )
  return lines
}

export const runSyncAll = async (
  options: SyncAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<SyncAllResult> => {
  const slugs = await listClientSlugs(clientDirBase)
  if (slugs.length === 0) {
    return { total: 0, updated: 0, skipped: 0, errors: 0, clients: [] }
  }
  const clients: ClientSyncStatus[] = []
  for (const slug of slugs) {
    const result = await syncOneClient(slug, options, clientDirBase)
    if (options.filter === 'outdated' && result.status === 'skipped') {
      continue
    }
    clients.push(result)
  }
  return {
    total: slugs.length,
    updated: clients.filter((c) => c.status === 'updated').length,
    skipped: clients.filter((c) => c.status === 'skipped').length,
    errors: clients.filter((c) => c.status === 'error').length,
    clients,
  }
}

export const run = async (): Promise<void> => {
  let options: SyncAllOptions
  try {
    options = parseSyncAllArgs(process.argv.slice(2))
  } catch (err) {
    if (err instanceof Error && err.message === 'HELP') {
      console.log(USAGE)
      return
    }
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
    console.log(USAGE)
    process.exit(1)
  }

  console.log(
    `[sync:clients]${options.apply ? ' APPLY' : ' (dry-run)'}${options.filter === 'outdated' ? ' filter=outdated' : ''}${options.template ? ` template=${options.template}` : ' (auto-detect)'}`,
  )

  const result = await runSyncAll(options)

  for (const line of formatSyncAllSummary(result)) {
    console.log(line)
  }

  if (!options.apply) {
    console.log('Run with --apply to apply changes')
  } else {
    console.log('Done. Backups created with .bak-<ts> suffix')
  }

  if (result.errors > 0) {
    process.exit(1)
  }
}
