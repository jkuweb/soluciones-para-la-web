import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseDepsArgs,
  readPackageJson,
  mergePackageJson,
  formatPkgChanges,
  type PackageJson,
  type UpdateDepsOptions,
} from '../../../scripts/update-deps'

vi.mock('@clack/prompts', () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('parseDepsArgs', () => {
  it('throws when --slug is missing', () => {
    expect(() => parseDepsArgs([])).toThrow(/Missing required --slug/)
  })

  it('throws when slug format is invalid', () => {
    expect(() => parseDepsArgs(['--slug=BAD slug'])).toThrow(/Invalid slug/)
  })

  it('parses --slug with defaults (dry-run, install, no template)', () => {
    const opts = parseDepsArgs(['--slug=educar-sano'])
    expect(opts).toEqual({ slug: 'educar-sano', apply: false, skipInstall: false })
    expect(opts.template).toBeUndefined()
  })

  it('parses --apply, --skip-install, --template flags', () => {
    const opts = parseDepsArgs(['--slug=x', '--apply', '--skip-install', '--template=nextjs'])
    expect(opts.apply).toBe(true)
    expect(opts.skipInstall).toBe(true)
    expect(opts.template).toBe('nextjs')
  })

  it('rejects invalid --template value', () => {
    expect(() => parseDepsArgs(['--slug=x', '--template=svelte'])).toThrow(/Invalid --template/)
  })

  it('rejects unknown argument', () => {
    expect(() => parseDepsArgs(['--slug=x', '--weird'])).toThrow(/Unknown argument/)
  })
})

describe('readPackageJson', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'rj-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('reads and parses a valid package.json', async () => {
    const dir = join(root, 'p')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }))
    const pkg = await readPackageJson(dir)
    expect(pkg.name).toBe('x')
    expect(pkg.version).toBe('1.0.0')
  })

  it('throws when package.json is missing', async () => {
    await expect(readPackageJson(join(root, 'missing'))).rejects.toThrow()
  })

  it('throws on invalid JSON', async () => {
    const dir = join(root, 'bad')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), 'not json {')
    await expect(readPackageJson(dir)).rejects.toThrow()
  })
})

describe('mergePackageJson', () => {
  const base: PackageJson = {
    name: 'tpl',
    version: '1.0.0',
    type: 'module',
    private: true,
    scripts: { dev: 'a', build: 'b' },
    dependencies: { astro: '^4.0.0' },
    devDependencies: { typescript: '^5.0.0' },
    engines: { node: '>=20' },
    pnpm: { onlyBuiltDependencies: ['sharp'] },
  }

  it('returns no changes when client and template are identical', () => {
    // Client must equal template to actually be "identical" — overriding name/version
    // makes them differ on identity fields.
    const client: PackageJson = base
    const { pkg, changes } = mergePackageJson(client, base)
    expect(pkg).toEqual(base)
    expect(changes.added).toEqual([])
    expect(changes.updated).toEqual([])
    expect(changes.removed).toEqual([])
  })

  it('adds dependencies that exist in template but not in client', () => {
    const client: PackageJson = { ...base, name: 'client', version: '2.0.0' }
    const tpl: PackageJson = { ...base, dependencies: { ...base.dependencies, react: '^19.0.0' } }
    const { pkg, changes } = mergePackageJson(client, tpl)
    expect(pkg.dependencies?.react).toBe('^19.0.0')
    expect(changes.added).toContainEqual({ section: 'dependencies', name: 'react', version: '^19.0.0' })
  })

  it('keeps client dependencies that template does not have (client wins)', () => {
    const client: PackageJson = {
      ...base,
      name: 'client',
      version: '2.0.0',
      dependencies: { ...base.dependencies, 'client-extra': '^1.0.0' },
    }
    const { pkg, changes } = mergePackageJson(client, base)
    expect(pkg.dependencies?.['client-extra']).toBe('^1.0.0')
    expect(changes.added).toContainEqual({ section: 'dependencies', name: 'client-extra', version: '^1.0.0' })
  })

  it('uses client version when both have the same dep with different versions', () => {
    const client: PackageJson = {
      ...base,
      name: 'client',
      version: '2.0.0',
      dependencies: { astro: '^4.5.0' },
    }
    const { pkg, changes } = mergePackageJson(client, base)
    expect(pkg.dependencies?.astro).toBe('^4.5.0')
    expect(changes.kept).toContainEqual({ section: 'dependencies', name: 'astro', version: '^4.5.0' })
  })

  it('keeps custom client scripts that are not in template', () => {
    const client: PackageJson = {
      ...base,
      name: 'client',
      version: '2.0.0',
      scripts: { ...base.scripts, custom: 'echo hi' },
    }
    const { pkg, changes } = mergePackageJson(client, base)
    expect(pkg.scripts?.custom).toBe('echo hi')
    expect(changes.added).toContainEqual({ section: 'scripts', name: 'custom', value: 'echo hi' })
  })

  it('adds new template scripts that client does not have', () => {
    const tpl: PackageJson = { ...base, scripts: { ...base.scripts, preview: 'astro preview' } }
    const client: PackageJson = { ...base, name: 'client', version: '2.0.0' }
    const { pkg, changes } = mergePackageJson(client, tpl)
    expect(pkg.scripts?.preview).toBe('astro preview')
    expect(changes.added).toContainEqual({ section: 'scripts', name: 'preview', value: 'astro preview' })
  })

  it('uses client script value when both define the same script', () => {
    const tpl: PackageJson = { ...base, scripts: { ...base.scripts, dev: 'astro dev' } }
    const client: PackageJson = {
      ...base,
      name: 'client',
      version: '2.0.0',
      scripts: { dev: 'astro dev --custom-flag' },
    }
    const { pkg, changes } = mergePackageJson(client, tpl)
    expect(pkg.scripts?.dev).toBe('astro dev --custom-flag')
    expect(changes.kept).toContainEqual({ section: 'scripts', name: 'dev', value: 'astro dev --custom-flag' })
  })

  it('merges devDependencies with client-wins semantics', () => {
    const client: PackageJson = {
      ...base,
      name: 'client',
      version: '2.0.0',
      devDependencies: { ...base.devDependencies, vitest: '^1.0.0' },
    }
    const tpl: PackageJson = {
      ...base,
      devDependencies: { ...base.devDependencies, eslint: '^9.0.0' },
    }
    const { pkg, changes } = mergePackageJson(client, tpl)
    expect(pkg.devDependencies?.vitest).toBe('^1.0.0')
    expect(pkg.devDependencies?.eslint).toBe('^9.0.0')
    // Convention used by the rest of the suite: client-only = added, template-only = added,
    // both-with-same = kept. typescript is in both with the same version; vitest is
    // client-only; eslint is template-only.
    expect(changes.added).toContainEqual({ section: 'devDependencies', name: 'eslint', version: '^9.0.0' })
    expect(changes.added).toContainEqual({ section: 'devDependencies', name: 'vitest', version: '^1.0.0' })
    expect(changes.kept).toContainEqual({ section: 'devDependencies', name: 'typescript', version: '^5.0.0' })
  })

  it('preserves the client name and version', () => {
    const client: PackageJson = { ...base, name: 'client', version: '2.5.0' }
    const { pkg } = mergePackageJson(client, base)
    expect(pkg.name).toBe('client')
    expect(pkg.version).toBe('2.5.0')
  })

  it('uses the template type field', () => {
    const client: PackageJson = { ...base, name: 'client', version: '2.0.0' }
    const tpl: PackageJson = { ...base, type: 'commonjs' }
    const { pkg } = mergePackageJson(client, tpl)
    expect(pkg.type).toBe('commonjs')
  })
})

describe('formatPkgChanges', () => {
  it('returns human-readable lines for added, updated, kept, and removed entries', () => {
    const lines = formatPkgChanges({
      added: [{ section: 'dependencies', name: 'react', version: '^19.0.0' }],
      updated: [{ section: 'dependencies', name: 'astro', from: '^4.0.0', to: '^4.5.0' }],
      kept: [{ section: 'dependencies', name: 'client-extra', version: '^1.0.0' }],
      removed: [{ section: 'devDependencies', name: 'old-tool' }],
    })
    expect(lines.some((l) => l.includes('+') && l.includes('react') && l.includes('^19.0.0'))).toBe(true)
    expect(lines.some((l) => l.includes('~') && l.includes('astro') && l.includes('^4.0.0') && l.includes('^4.5.0'))).toBe(true)
    expect(lines.some((l) => l.includes('=') && l.includes('client-extra'))).toBe(true)
    expect(lines.some((l) => l.includes('-') && l.includes('old-tool'))).toBe(true)
  })

  it('returns an empty array when there are no changes', () => {
    const lines = formatPkgChanges({ added: [], updated: [], kept: [], removed: [] })
    expect(lines).toEqual([])
  })
})
