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

export const updateOneClient = async (
  slug: string,
  options: UpdateAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<ClientUpdateStatus> => {
  const clientDir = path.join(clientDirBase, slug)
  let templateType: FrontendType
  let clientPkg: PackageJson
  let templatePkg: PackageJson

  try {
    templateType = options.template ?? (await detectTemplateType(clientDir))
    clientPkg = await readPackageJson(clientDir)
    templatePkg = await readPackageJson(getTemplateDir(templateType))
  } catch (err) {
    return { slug, status: 'error', reason: err instanceof Error ? err.message : String(err) }
  }

  const { pkg, changes } = mergePackageJson(clientPkg, templatePkg)
  const hasChanges = changes.added.length + changes.updated.length > 0
  const templateVersion = templatePkg.version ?? '0.0.0'

  if (!hasChanges) {
    return { slug, status: 'skipped', reason: 'up-to-date' }
  }

  if (!options.apply) {
    return {
      slug,
      status: 'updated',
      template: templateType,
      added: changes.added.length,
      updated: changes.updated.length,
      installed: false,
    }
  }

  // Apply mode
  try {
    const ts = Math.floor(Date.now() / 1000)
    const backupPath = path.join(clientDir, `package.json.bak-${ts}`)
    const currentRaw = await readFile(path.join(clientDir, 'package.json'), 'utf-8')
    await writeFile(backupPath, currentRaw, 'utf-8')
    await writeFile(
      path.join(clientDir, 'package.json'),
      `${JSON.stringify(pkg, null, 2)}\n`,
      'utf-8',
    )

    // Update .template-version.json (best effort)
    const versionFile = path.join(clientDir, '.template-version.json')
    try {
      const versionRaw = await readFile(versionFile, 'utf-8')
      const meta = JSON.parse(versionRaw) as Record<string, unknown>
      meta.template = templateType
      meta.version = templateVersion
      meta.lastSyncedAt = new Date().toISOString()
      await writeFile(versionFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8')
    } catch {
      // missing or invalid - skip
    }
  } catch (err) {
    return { slug, status: 'error', reason: err instanceof Error ? err.message : String(err) }
  }

  let installed = false
  if (!options.skipInstall) {
    try {
      const code = await runPnpmInstall(clientDir)
      if (code !== 0) {
        return { slug, status: 'error', reason: `pnpm install exited with code ${code}` }
      }
      installed = true
    } catch (err) {
      return { slug, status: 'error', reason: err instanceof Error ? err.message : String(err) }
    }
  }

  return {
    slug,
    status: 'updated',
    template: templateType,
    added: changes.added.length,
    updated: changes.updated.length,
    installed,
  }
}

const runPnpmInstall = (cwd: string): Promise<number | null> => {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code))
  })
}

export const runUpdateAll = async (
  options: UpdateAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<UpdateAllResult> => {
  const slugs = await listClientSlugs(clientDirBase)
  if (slugs.length === 0) {
    return { total: 0, updated: 0, skipped: 0, errors: 0, clients: [] }
  }
  const clients: ClientUpdateStatus[] = []
  for (const slug of slugs) {
    const result = await updateOneClient(slug, options, clientDirBase)
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

const pad = (s: string, n: number): string => s.padEnd(n).slice(0, n)

export const formatUpdateAllSummary = (result: UpdateAllResult): string[] => {
  const headers = ['Client', 'Template', 'PkgΔ', 'Status']
  const widths = [16, 10, 8, 40]
  const rows: string[][] = result.clients.map((c) => {
    if (c.status === 'updated') {
      return [c.slug, c.template, `${c.added}+${c.updated}~`, 'updated']
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

// Re-export for tests
export { detectTemplateType, getClientDir }
