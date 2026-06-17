import path from 'node:path'
import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const TEMPLATES_DIR = MONOREPO_ROOT
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'
export const SLUG_REGEX = /^[a-z0-9-]+$/

export type FrontendType = 'astro' | 'nextjs'

export type UpdateDepsOptions = {
  slug: string
  apply: boolean
  skipInstall: boolean
  template?: FrontendType
}

export type DepChange =
  | { section: string; name: string; version: string }
  | { section: string; name: string; value: string }

export type DepUpdate = { section: string; name: string; from: string; to: string }

export type DepRemoval = { section: string; name: string }

export type MergeResult = {
  added: DepChange[]
  updated: DepUpdate[]
  kept: DepChange[]
  removed: DepRemoval[]
}

export type PackageJson = {
  name?: string
  version?: string
  description?: string
  type?: string
  private?: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  engines?: Record<string, string>
  pnpm?: Record<string, unknown>
  [key: string]: unknown
}

const USAGE =
  'Usage: pnpm update:client --slug=<slug> [--apply] [--template=astro|nextjs] [--skip-install]'

export const parseDepsArgs = (args: string[]): UpdateDepsOptions => {
  let slug: string | undefined
  let template: FrontendType | undefined
  let apply = false
  let skipInstall = false

  for (const arg of args) {
    if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length)
    } else if (arg.startsWith('--template=')) {
      const value = arg.slice('--template='.length)
      if (value !== 'astro' && value !== 'nextjs') {
        throw new Error(`Invalid --template value: ${value}. Use "astro" or "nextjs".`)
      }
      template = value
    } else if (arg === '--apply') {
      apply = true
    } else if (arg === '--skip-install') {
      skipInstall = true
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('HELP')
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!slug) {
    throw new Error('Missing required --slug argument')
  }
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(`Invalid slug format: ${slug}. Use lowercase letters, numbers, and dashes.`)
  }

  const options: UpdateDepsOptions = { slug, apply, skipInstall }
  if (template !== undefined) options.template = template
  return options
}

export const getTemplateDir = (frontendType: FrontendType): string =>
  path.join(TEMPLATES_DIR, `${frontendType}-starter`)

export const getClientDir = (slug: string): string => path.join(CLIENTS_DIR, slug)

export const readPackageJson = async (dir: string): Promise<PackageJson> => {
  const raw = await readFile(path.join(dir, 'package.json'), 'utf-8')
  return JSON.parse(raw) as PackageJson
}

const mergeSection = (
  section: string,
  client: Record<string, string> | undefined,
  template: Record<string, string> | undefined,
  changes: MergeResult,
): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [name, version] of Object.entries(template ?? {})) {
    out[name] = version
  }
  for (const [name, version] of Object.entries(client ?? {})) {
    if (!(name in out)) {
      out[name] = version
      changes.added.push({ section, name, version })
    } else if (out[name] !== version) {
      // Client wins on conflict; client kept their custom value.
      out[name] = version
      changes.kept.push({ section, name, version })
    } else {
      changes.kept.push({ section, name, version })
    }
  }
  // Track template-only items as added (new entries introduced by template).
  for (const [name, version] of Object.entries(template ?? {})) {
    if (!(name in (client ?? {}))) {
      changes.added.push({ section, name, version })
    }
  }
  return out
}

export const mergePackageJson = (
  client: PackageJson,
  template: PackageJson,
): { pkg: PackageJson; changes: MergeResult } => {
  const changes: MergeResult = { added: [], updated: [], kept: [], removed: [] }
  const pkg: PackageJson = {}

  // Identity
  if (client.name !== undefined) pkg.name = client.name
  if (client.version !== undefined) pkg.version = client.version
  if (client.description !== undefined) pkg.description = client.description

  // Template wins
  pkg.type = template.type ?? client.type ?? 'module'
  pkg.private = client.private ?? template.private ?? true
  pkg.engines = template.engines ?? client.engines
  if (template.pnpm) pkg.pnpm = template.pnpm

  // Merged
  const scriptsClient = client.scripts
  const scriptsTemplate = template.scripts
  const mergedScripts: Record<string, string> = {}
  for (const [name, value] of Object.entries(scriptsTemplate ?? {})) {
    mergedScripts[name] = value
  }
  for (const [name, value] of Object.entries(scriptsClient ?? {})) {
    if (!(name in mergedScripts)) {
      mergedScripts[name] = value
      changes.added.push({ section: 'scripts', name, value })
    } else if (mergedScripts[name] !== value) {
      // Client wins on conflict; client kept their custom value.
      mergedScripts[name] = value
      changes.kept.push({ section: 'scripts', name, value })
    } else {
      changes.kept.push({ section: 'scripts', name, value })
    }
  }
  // Track template-only scripts as added (new entries introduced by template).
  for (const [name, value] of Object.entries(scriptsTemplate ?? {})) {
    if (!(name in (scriptsClient ?? {}))) {
      changes.added.push({ section: 'scripts', name, value })
    }
  }
  pkg.scripts = mergedScripts

  pkg.dependencies = mergeSection('dependencies', client.dependencies, template.dependencies, changes)
  pkg.devDependencies = mergeSection(
    'devDependencies',
    client.devDependencies,
    template.devDependencies,
    changes,
  )

  return { pkg, changes }
}

export const formatPkgChanges = (changes: MergeResult): string[] => {
  const lines: string[] = []
  for (const c of changes.added) {
    if ('version' in c) lines.push(`  + ${c.section}.${c.name}@${c.version}`)
    else lines.push(`  + ${c.section}.${c.name} = ${c.value}`)
  }
  for (const u of changes.updated) {
    if ('from' in u) lines.push(`  ~ ${u.section}.${u.name}: ${u.from} → ${u.to}`)
  }
  for (const k of changes.kept) {
    if ('version' in k) lines.push(`  = ${k.section}.${k.name}@${k.version} (kept client value)`)
    else lines.push(`  = ${k.section}.${k.name} = ${k.value} (kept client value)`)
  }
  for (const r of changes.removed) {
    lines.push(`  - ${r.section}.${r.name}`)
  }
  return lines
}

export const runPnpmInstall = (
  cwd: string,
  options: { apply: boolean; dryRunMessage: string },
): Promise<{ code: number | null }> => {
  return new Promise((resolve, reject) => {
    if (!options.apply) {
      console.log(options.dryRunMessage)
      resolve({ code: 0 })
      return
    }
    const child = spawn('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve({ code }))
  })
}

export const run = async (): Promise<void> => {
  let options: UpdateDepsOptions
  try {
    options = parseDepsArgs(process.argv.slice(2))
  } catch (err) {
    if ((err as Error).message === 'HELP') {
      console.log(USAGE)
      return
    }
    console.error(`Error: ${(err as Error).message}`)
    console.log(USAGE)
    process.exit(1)
  }

  const clientDir = getClientDir(options.slug)
  const clientPkg = await readPackageJson(clientDir)
  const templateType = options.template ?? detectFromPkgName(clientPkg.name)
  const templateDir = getTemplateDir(templateType)
  const templatePkg = await readPackageJson(templateDir)

  const { pkg, changes } = mergePackageJson(clientPkg, templatePkg)

  console.log(
    `[update] slug=${options.slug} template=${templateType}${options.apply ? ' APPLY' : ' (dry-run)'}${options.skipInstall ? ' skip-install' : ''}`,
  )
  console.log(`[update] Changes (${changes.added.length} added, ${changes.updated.length} updated, ${changes.kept.length} kept):`)
  const lines = formatPkgChanges(changes)
  if (lines.length === 0) console.log('  (no changes)')
  for (const l of lines) console.log(l)

  if (!options.apply) {
    console.log('Run with --apply to write changes')
    return
  }

  const ts = Math.floor(Date.now() / 1000)
  const backupPath = path.join(clientDir, `package.json.bak-${ts}`)
  const currentRaw = await readFile(path.join(clientDir, 'package.json'), 'utf-8')
  await writeFile(backupPath, currentRaw, 'utf-8')
  await writeFile(
    path.join(clientDir, 'package.json'),
    `${JSON.stringify(pkg, null, 2)}\n`,
    'utf-8',
  )
  console.log(`[update] Wrote ${clientDir}/package.json (backup: package.json.bak-${ts})`)

  if (options.skipInstall) {
    console.log('[update] Skipping pnpm install (--skip-install).')
    return
  }

  console.log('[update] Running pnpm install --no-frozen-lockfile...')
  const { code } = await runPnpmInstall(clientDir, {
    apply: true,
    dryRunMessage: '[dry-run] would run: pnpm install --no-frozen-lockfile',
  })
  if (code !== 0) {
    throw new Error(`pnpm install exited with code ${code}`)
  }
  console.log('[update] Done.')
}

const detectFromPkgName = (name: string | undefined): FrontendType => {
  if (name === 'astro-starter') return 'astro'
  if (name === 'nextjs-starter') return 'nextjs'
  throw new Error(
    `Cannot detect template type from package.json name "${String(name) ?? '(missing)'}". Use --template=astro or --template=nextjs.`,
  )
}
