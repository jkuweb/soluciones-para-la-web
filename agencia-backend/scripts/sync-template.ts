import path from 'node:path'
import { cp, readFile, writeFile, stat } from 'node:fs/promises'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const TEMPLATES_DIR = MONOREPO_ROOT
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'
export const SLUG_REGEX = /^[a-z0-9-]+$/

export type FrontendType = 'astro' | 'nextjs'

export type SyncOptions = {
  slug: string
  apply: boolean
  verbose: boolean
  template?: FrontendType
  clientDirOverride?: string
}

export type FileAction = 'unchanged' | 'updated' | 'added'

export type SyncFileResult = {
  action: FileAction
  lineDelta?: { added: number; removed: number }
  backupPath?: string
}

export type SyncAction = {
  path: string
  action: FileAction
  lineDelta?: { added: number; removed: number }
  backupPath?: string
}

export type SyncResult = {
  unchanged: number
  updated: number
  added: number
  actions: SyncAction[]
}

const BLOCKLIST: readonly string[] = [
  'src/styles/global.css',
  'src/styles/variables.css',
  'src/styles/theme.css',
  'src/components/blocks/*',
  'src/components/**/styles.css',
  '.env',
  '.env.example',
  '.env.local',
  'node_modules/',
  'dist/',
  '.next/',
  '.astro/',
  'public/',
]

const ALLOWLIST_ASTRO: readonly string[] = [
  'src/lib/payload.ts',
  'src/lib/types.ts',
  'src/lib/lexical.ts',
  'src/components/BlockRenderer.astro',
  'src/components/Link.astro',
  'src/components/shared/SeoHead.astro',
  'src/components/HeroBlock/index.astro',
  'src/components/FooterBlock/index.astro',
  'src/components/blog/PostCard.astro',
  'src/components/blog/PostCard.module.css',
  'src/components/blog/Post.astro',
  'src/components/blog/Post.module.css',
  'src/layouts/Layout.astro',
  'src/content/site.config.ts',
  'src/pages/[slug].astro',
  'src/pages/index.astro',
  'src/pages/404.astro',
  'src/pages/preview.astro',
  'src/pages/blog/index.astro',
  'src/pages/blog/post/[slug].astro',
  'src/pages/blog/category/[slug]/index.astro',
  'src/pages/blog/tag/[slug]/index.astro',
  'astro.config.mjs',
  'tsconfig.json',
]

const ALLOWLIST_NEXTJS: readonly string[] = [
  'src/lib/payload.ts',
  'src/lib/types.ts',
  'src/lib/lexical.ts',
  'src/components/BlockRenderer.tsx',
  'src/components/Link.tsx',
  'src/components/shared/SeoHead.tsx',
  'src/components/HeroBlock/index.tsx',
  'src/components/FooterBlock/index.tsx',
  'src/components/blog/PostCard.tsx',
  'src/components/blog/PostCard.module.css',
  'src/components/blog/Post.tsx',
  'src/components/blog/Post.module.css',
  'src/app/layout.tsx',
  'src/content/site.config.ts',
  'src/app/[slug]/page.tsx',
  'src/app/page.tsx',
  'src/app/not-found.tsx',
  'src/app/preview/page.tsx',
  'src/app/blog/page.tsx',
  'src/app/blog/post/[slug]/page.tsx',
  'src/app/blog/category/[slug]/page.tsx',
  'src/app/blog/tag/[slug]/page.tsx',
  'next.config.ts',
  'tsconfig.json',
]

const USAGE =
  'Usage: pnpm sync:client --slug=<slug> [--apply] [--verbose] [--template=astro|nextjs]'

export const getBlocklist = (): readonly string[] => BLOCKLIST

export const getAllowlist = (frontendType: FrontendType): string[] => {
  return [...(frontendType === 'astro' ? ALLOWLIST_ASTRO : ALLOWLIST_NEXTJS)]
}

export const getTemplateDir = (frontendType: FrontendType): string =>
  path.join(TEMPLATES_DIR, `${frontendType}-starter`)

export const getClientDir = (slug: string): string => path.join(CLIENTS_DIR, slug)

export const parseArgs = (args: string[]): SyncOptions => {
  let slug: string | undefined
  let template: FrontendType | undefined
  let apply = false
  let verbose = false

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
    } else if (arg === '--verbose') {
      verbose = true
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

  const options: SyncOptions = { slug, apply, verbose }
  if (template !== undefined) options.template = template
  return options
}

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

export const detectTemplateType = async (clientDir: string): Promise<FrontendType> => {
  const pkgPath = path.join(clientDir, 'package.json')
  const raw = await readFile(pkgPath, 'utf-8')
  const parsed: unknown = JSON.parse(raw)
  const name =
    typeof parsed === 'object' && parsed !== null && 'name' in parsed
      ? (parsed as { name?: unknown }).name
      : undefined
  if (name === 'astro-starter') return 'astro'
  if (name === 'nextjs-starter') return 'nextjs'
  throw new Error(
    `Cannot detect template type from package.json name "${String(name) ?? '(missing)'}". Use --template=astro or --template=nextjs.`,
  )
}

export const diffFiles = (
  a: string,
  b: string,
): { changed: boolean; lineDelta: { added: number; removed: number } } => {
  if (a === b) {
    return { changed: false, lineDelta: { added: 0, removed: 0 } }
  }
  const aCount = new Map<string, number>()
  const bCount = new Map<string, number>()
  for (const line of a.split('\n')) aCount.set(line, (aCount.get(line) ?? 0) + 1)
  for (const line of b.split('\n')) bCount.set(line, (bCount.get(line) ?? 0) + 1)
  let added = 0
  let removed = 0
  for (const [line, count] of bCount) {
    const aHas = aCount.get(line) ?? 0
    if (count > aHas) added += count - aHas
  }
  for (const [line, count] of aCount) {
    const bHas = bCount.get(line) ?? 0
    if (count > bHas) removed += count - bHas
  }
  return { changed: true, lineDelta: { added, removed } }
}

const makeVerboseDiff = (a: string, b: string, max = 20): string[] => {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const out: string[] = []
  const maxLen = Math.max(aLines.length, bLines.length)
  for (let i = 0; i < maxLen && out.length < max; i++) {
    const al = aLines[i]
    const bl = bLines[i]
    if (al === bl) continue
    if (al !== undefined) out.push(`-${al}`)
    if (out.length >= max) break
    if (bl !== undefined) out.push(`+${bl}`)
  }
  return out
}

export const syncFile = async (
  srcPath: string,
  destPath: string,
  options: SyncOptions,
): Promise<SyncFileResult> => {
  const srcExists = await fileExists(srcPath)
  if (!srcExists) {
    return { action: 'unchanged' }
  }
  const destExists = await fileExists(destPath)
  if (!destExists) {
    if (options.apply) {
      await cp(srcPath, destPath)
    }
    return { action: 'added' }
  }
  const [srcContent, destContent] = await Promise.all([
    readFile(srcPath, 'utf-8'),
    readFile(destPath, 'utf-8'),
  ])
  const { changed, lineDelta } = diffFiles(destContent, srcContent)
  if (!changed) {
    return { action: 'unchanged' }
  }
  let backupPath: string | undefined
  if (options.apply) {
    const ts = Math.floor(Date.now() / 1000)
    backupPath = `${destPath}.bak-${ts}`
    await writeFile(backupPath, destContent, 'utf-8')
    await cp(srcPath, destPath, { recursive: false })
  }
  return { action: 'updated', lineDelta, backupPath }
}

export const syncTemplate = async (options: SyncOptions): Promise<SyncResult> => {
  const clientDir = options.clientDirOverride ?? getClientDir(options.slug)
  if (!(await fileExists(clientDir))) {
    throw new Error(`Client directory does not exist: ${clientDir}`)
  }
  const templateType =
    options.template ?? (await detectTemplateType(clientDir))
  const templateDir = getTemplateDir(templateType)
  if (!(await fileExists(templateDir))) {
    throw new Error(`Template directory does not exist: ${templateDir}`)
  }
  const allowlist = getAllowlist(templateType)
  const result: SyncResult = { unchanged: 0, updated: 0, added: 0, actions: [] }
  for (const relPath of allowlist) {
    const srcPath = path.join(templateDir, relPath)
    const destPath = path.join(clientDir, relPath)
    if (!(await fileExists(srcPath))) continue
    const result_ = await syncFile(srcPath, destPath, options)
    const action: SyncAction = { path: relPath, action: result_.action }
    if (result_.lineDelta) action.lineDelta = result_.lineDelta
    if (result_.backupPath) action.backupPath = result_.backupPath
    result.actions.push(action)
    if (result_.action === 'unchanged') result.unchanged++
    else if (result_.action === 'updated') result.updated++
    else if (result_.action === 'added') result.added++
  }
  return result
}

export const formatSyncResult = (result: SyncResult, options: SyncOptions): string[] => {
  const lines: string[] = []
  for (const { path: relPath, action, lineDelta, backupPath } of result.actions) {
    if (action === 'unchanged') {
      lines.push(`[skip]    ${relPath}  (unchanged)`)
      continue
    }
    if (action === 'added') {
      const tag = options.apply ? '[added]' : '[new]   '
      lines.push(`${tag}  ${relPath}`)
      continue
    }
    const delta = lineDelta ? ` (+${lineDelta.added} / -${lineDelta.removed} lines)` : ''
    if (options.apply) {
      const backup = backupPath ? path.basename(backupPath) : ''
      lines.push(`[updated] ${relPath}${delta}  (backup: ${backup})`)
    } else {
      lines.push(`[change]  ${relPath}${delta}`)
    }
  }
  return lines
}

export const run = async (): Promise<void> => {
  let options: SyncOptions
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (err) {
    if ((err as Error).message === 'HELP') {
      console.log(USAGE)
      return
    }
    console.error(`Error: ${(err as Error).message}`)
    console.log(USAGE)
    process.exit(1)
  }

  console.log(
    `[sync] slug=${options.slug}` +
      `${options.template ? ` template=${options.template}` : ' (auto-detect)'}` +
      `${options.apply ? ' APPLY' : ' (dry-run)'}` +
      `${options.verbose ? ' verbose' : ''}`,
  )
  console.log('[sync] Blocklist (protected, will not touch):')
  for (const blocked of BLOCKLIST) console.log(`  - ${blocked}`)

  const result = await syncTemplate(options)

  const lines = formatSyncResult(result, options)
  for (const l of lines) console.log(l)

  if (options.verbose) {
    console.log('[sync] Verbose diffs:')
    for (const { path: relPath, action, lineDelta } of result.actions) {
      if (action === 'unchanged' || action === 'added') continue
      const srcPath = path.join(getTemplateDir(options.template ?? 'astro'), relPath)
      const destPath = path.join(getClientDir(options.slug), relPath)
      const [a, b] = await Promise.all([
        readFile(destPath, 'utf-8').catch(() => ''),
        readFile(srcPath, 'utf-8').catch(() => ''),
      ])
      const diff = makeVerboseDiff(a, b)
      console.log(`  -- ${relPath} (+${lineDelta?.added ?? 0} / -${lineDelta?.removed ?? 0}) --`)
      for (const d of diff) console.log(`    ${d}`)
    }
  }

  console.log(
    `[sync] Summary: ${result.unchanged} unchanged, ${result.updated} changed, ${result.added} added`,
  )
  if (!options.apply) {
    console.log('Run with --apply to apply changes')
  } else {
    console.log('Done. Backups created with .bak-<ts> suffix')
  }
}
