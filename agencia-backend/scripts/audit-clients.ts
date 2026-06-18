import path from 'node:path'
import { readFile, readdir, stat } from 'node:fs/promises'
import {
  syncTemplate,
  detectTemplateType,
  getTemplateDir,
  getClientDir,
  getAllowlist,
  SLUG_REGEX,
  type FrontendType,
} from './sync-template.js'
import { readPackageJson, mergePackageJson, type PackageJson } from './update-deps.js'
import { readTemplateVersion, TEMPLATE_VERSION_FILENAME } from './lib/template-version.js'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export type AuditStatus = 'up-to-date' | 'out-of-date' | 'error'

export type ClientAudit = {
  slug: string
  templateType: FrontendType | null
  templateVersion: string | null
  clientTemplateVersion: string | null
  filesChanged: number
  filesAdded: number
  pkgChanges: number
  status: AuditStatus
  reason?: string
}

export type AuditOptions = {
  slug?: string
  json: boolean
  filter: 'all' | 'outdated'
}

export type AuditReport = {
  generatedAt: string
  clients: ClientAudit[]
  summary: { total: number; upToDate: number; outOfDate: number; errors: number }
}

const USAGE =
  'Usage: pnpm audit:clients [--slug=<slug>] [--json] [--filter=all|outdated]'

export const parseAuditArgs = (args: string[]): AuditOptions => {
  let slug: string | undefined
  let json = false
  let filter: 'all' | 'outdated' = 'all'

  for (const arg of args) {
    if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length)
    } else if (arg === '--json') {
      json = true
    } else if (arg.startsWith('--filter=')) {
      const value = arg.slice('--filter='.length)
      if (value !== 'all' && value !== 'outdated') {
        throw new Error(`Invalid --filter value: ${value}. Use "all" or "outdated".`)
      }
      filter = value
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('HELP')
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (slug !== undefined && !SLUG_REGEX.test(slug)) {
    throw new Error(`Invalid slug format: ${slug}. Use lowercase letters, numbers, and dashes.`)
  }

  return { slug, json, filter }
}

const isDirectory = async (p: string): Promise<boolean> => {
  try {
    return (await stat(p)).isDirectory()
  } catch {
    return false
  }
}

export const listClientSlugs = async (clientsDir: string = CLIENTS_DIR): Promise<string[]> => {
  let entries: string[]
  try {
    entries = await readdir(clientsDir)
  } catch {
    return []
  }
  const slugs: string[] = []
  for (const entry of entries) {
    if (!SLUG_REGEX.test(entry)) continue
    if (await isDirectory(path.join(clientsDir, entry))) {
      slugs.push(entry)
    }
  }
  return slugs.sort()
}

const readClientTemplateVersion = async (clientDir: string): Promise<string | null> => {
  try {
    const raw = await readFile(path.join(clientDir, TEMPLATE_VERSION_FILENAME), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { version?: unknown }).version === 'string'
    ) {
      return (parsed as { version: string }).version
    }
    return null
  } catch {
    return null
  }
}

export const auditClient = async (slug: string, clientDir?: string): Promise<ClientAudit> => {
  const resolvedDir = clientDir ?? getClientDir(slug)
  if (!(await isDirectory(resolvedDir))) {
    return {
      slug,
      templateType: null,
      templateVersion: null,
      clientTemplateVersion: null,
      filesChanged: 0,
      filesAdded: 0,
      pkgChanges: 0,
      status: 'error',
      reason: `Client directory does not exist: ${resolvedDir}`,
    }
  }

  // 1. Detect template type from client's package.json
  let templateType: FrontendType
  try {
    templateType = await detectTemplateType(resolvedDir)
  } catch (err) {
    return {
      slug,
      templateType: null,
      templateVersion: null,
      clientTemplateVersion: null,
      filesChanged: 0,
      filesAdded: 0,
      pkgChanges: 0,
      status: 'error',
      reason: `Cannot detect template type from package.json: ${(err as Error).message}`,
    }
  }

  // 2. Read current template version (from the template's package.json)
  let templateVersion: string
  try {
    const tv = await readTemplateVersion(getTemplateDir(templateType))
    templateVersion = tv.version
  } catch (err) {
    return {
      slug,
      templateType,
      templateVersion: null,
      clientTemplateVersion: null,
      filesChanged: 0,
      filesAdded: 0,
      pkgChanges: 0,
      status: 'error',
      reason: `Cannot read template version: ${(err as Error).message}`,
    }
  }

  // 3. Read client's recorded template version from .template-version.json
  const clientTemplateVersion = await readClientTemplateVersion(resolvedDir)

  // 4. Audit allowlisted files via syncTemplate in dry-run mode
  let filesChanged = 0
  let filesAdded = 0
  try {
    const syncResult = await syncTemplate({ slug, apply: false, verbose: false, template: templateType, clientDirOverride: resolvedDir })
    filesChanged = syncResult.updated
    filesAdded = syncResult.added
  } catch (err) {
    return {
      slug,
      templateType,
      templateVersion,
      clientTemplateVersion,
      filesChanged: 0,
      filesAdded: 0,
      pkgChanges: 0,
      status: 'error',
      reason: `File audit failed: ${(err as Error).message}`,
    }
  }

  // 5. Audit package.json via mergePackageJson
  let pkgChanges = 0
  try {
    const clientPkg = await readPackageJson(resolvedDir)
    const templatePkg = await readPackageJson(getTemplateDir(templateType))
    const { changes } = mergePackageJson(clientPkg, templatePkg)
    pkgChanges = changes.added.length + changes.updated.length
  } catch (err) {
    return {
      slug,
      templateType,
      templateVersion,
      clientTemplateVersion,
      filesChanged,
      filesAdded,
      pkgChanges: 0,
      status: 'error',
      reason: `package.json audit failed: ${(err as Error).message}`,
    }
  }

  // 6. Determine status
  const versionMismatch = clientTemplateVersion !== templateVersion
  const hasChanges = filesChanged + filesAdded + pkgChanges > 0
  const status: AuditStatus = hasChanges || versionMismatch ? 'out-of-date' : 'up-to-date'

  return {
    slug,
    templateType,
    templateVersion,
    clientTemplateVersion,
    filesChanged,
    filesAdded,
    pkgChanges,
    status,
  }
}

export const auditAllClients = async (options: AuditOptions): Promise<AuditReport> => {
  const slugs = options.slug ? [options.slug] : await listClientSlugs()
  const clients: ClientAudit[] = []
  for (const slug of slugs) {
    clients.push(await auditClient(slug))
  }
  const summary = {
    total: clients.length,
    upToDate: clients.filter((c) => c.status === 'up-to-date').length,
    outOfDate: clients.filter((c) => c.status === 'out-of-date').length,
    errors: clients.filter((c) => c.status === 'error').length,
  }
  return { generatedAt: new Date().toISOString(), clients, summary }
}

const pad = (s: string, n: number): string => s.padEnd(n).slice(0, n)

export const formatAuditTable = (report: AuditReport): string[] => {
  const rows = report.clients.map((c) => {
    const tmpl = c.templateType ?? '-'
    const files = `${c.filesChanged}c+${c.filesAdded}a`
    const pkg = String(c.pkgChanges)
    const tver = c.clientTemplateVersion ?? '?'
    const curTver = c.templateVersion ?? '?'
    const tverCell = tver === curTver ? tver : `${tver} (→ ${curTver})`
    const reason = c.reason ? ` — ${c.reason}` : ''
    return [c.slug, tmpl, files, pkg, tverCell, c.status + reason]
  })

  const headers = ['Client', 'Template', 'Files', 'PkgΔ', 'TemplateVer', 'Status']
  const widths = [16, 10, 8, 6, 22, 40]
  const lines: string[] = []
  lines.push(headers.map((h, i) => pad(h, widths[i])).join('  '))
  lines.push(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of rows) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join('  '))
  }
  lines.push('')
  lines.push(
    `Total: ${report.summary.total} | Up-to-date: ${report.summary.upToDate} | Out-of-date: ${report.summary.outOfDate} | Errors: ${report.summary.errors}`,
  )
  return lines
}

export const formatAuditJson = (report: AuditReport): string =>
  `${JSON.stringify(report, null, 2)}\n`

export const run = async (): Promise<void> => {
  let options: AuditOptions
  try {
    options = parseAuditArgs(process.argv.slice(2))
  } catch (err) {
    if ((err as Error).message === 'HELP') {
      console.log(USAGE)
      return
    }
    console.error(`Error: ${(err as Error).message}`)
    console.log(USAGE)
    process.exit(1)
  }

  const report = await auditAllClients(options)
  const filteredReport: AuditReport =
    options.filter === 'outdated'
      ? { ...report, clients: report.clients.filter((c) => c.status !== 'up-to-date') }
      : report

  if (options.json) {
    process.stdout.write(formatAuditJson(filteredReport))
  } else {
    for (const line of formatAuditTable(filteredReport)) console.log(line)
  }
}
