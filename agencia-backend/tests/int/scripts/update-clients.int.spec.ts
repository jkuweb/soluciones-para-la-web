import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseUpdateAllArgs, updateOneClient, runUpdateAll, formatUpdateAllSummary, type UpdateAllResult, MONOREPO_ROOT } from '../../../scripts/update-clients'

describe('parseUpdateAllArgs', () => {
  it('returns defaults when no args given', () => {
    expect(parseUpdateAllArgs([])).toEqual({ apply: false, filter: 'all', skipInstall: false })
  })

  it('parses --apply', () => {
    expect(parseUpdateAllArgs(['--apply']).apply).toBe(true)
  })

  it('parses --skip-install', () => {
    expect(parseUpdateAllArgs(['--skip-install']).skipInstall).toBe(true)
  })

  it('parses --filter=outdated and --filter=all', () => {
    expect(parseUpdateAllArgs(['--filter=outdated']).filter).toBe('outdated')
    expect(parseUpdateAllArgs(['--filter=all']).filter).toBe('all')
  })

  it('rejects invalid --filter value', () => {
    expect(() => parseUpdateAllArgs(['--filter=foo'])).toThrow(/Invalid --filter/)
  })

  it('parses --template=astro and --template=nextjs', () => {
    expect(parseUpdateAllArgs(['--template=astro']).template).toBe('astro')
    expect(parseUpdateAllArgs(['--template=nextjs']).template).toBe('nextjs')
  })

  it('rejects invalid --template value', () => {
    expect(() => parseUpdateAllArgs(['--template=svelte'])).toThrow(/Invalid --template/)
  })

  it('rejects unknown argument', () => {
    expect(() => parseUpdateAllArgs(['--weird'])).toThrow(/Unknown argument/)
  })
})

const ASTRO_TEMPLATE = join(MONOREPO_ROOT, 'astro-starter')

const setupClientMirror = (root: string): string => {
  const clientDir = join(root, 'client-x')
  mkdirSync(clientDir, { recursive: true })
  const pkg = JSON.parse(readFileSync(join(ASTRO_TEMPLATE, 'package.json'), 'utf-8'))
  writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))
  return clientDir
}

describe('updateOneClient (dry-run)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'update-one-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns "skipped" when package.json matches template', async () => {
    setupClientMirror(root)
    const result = await updateOneClient('client-x', { apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.status).toBe('skipped')
  })

  it('returns "updated" when client has client-only deps (dry-run)', async () => {
    const clientDir = setupClientMirror(root)
    const pkg = JSON.parse(readFileSync(join(clientDir, 'package.json'), 'utf-8'))
    pkg.dependencies = { ...pkg.dependencies, 'client-extra': '^1.0.0' }
    writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))

    const result = await updateOneClient('client-x', { apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.added).toBeGreaterThan(0)
      expect(result.installed).toBe(false)
    }
  })

  it('returns "error" when client dir missing', async () => {
    const result = await updateOneClient('missing', { apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.status).toBe('error')
  })
})

describe('runUpdateAll', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'run-update-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns empty result when no clients', async () => {
    const result = await runUpdateAll({ apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.total).toBe(0)
  })

  it('processes all clients by default', async () => {
    setupClientMirror(root)
    const result = await runUpdateAll({ apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.total).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('skips up-to-date clients when filter=outdated', async () => {
    setupClientMirror(root)
    const result = await runUpdateAll({ apply: false, filter: 'outdated', skipInstall: false }, root)
    expect(result.total).toBe(1)
    expect(result.clients).toEqual([])
  })

  it('counts skipped clients even when filter=outdated excludes them from clients', async () => {
    // client-x mirrors the template (will be skipped)
    setupClientMirror(root)
    // Add a second client with a client-only dep (will be updated)
    const clientY = join(root, 'client-y')
    mkdirSync(clientY, { recursive: true })
    const pkg = JSON.parse(readFileSync(join(ASTRO_TEMPLATE, 'package.json'), 'utf-8'))
    pkg.dependencies = { ...pkg.dependencies, 'client-extra': '^1.0.0' }
    writeFileSync(join(clientY, 'package.json'), JSON.stringify(pkg, null, 2))

    const result = await runUpdateAll({ apply: false, filter: 'outdated', skipInstall: false }, root)
    expect(result.total).toBe(2)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(1) // counted even though excluded from clients
    expect(result.errors).toBe(0)
    expect(result.clients.length).toBe(1) // only the updated client is in the array
  })

  it('continues on error', async () => {
    setupClientMirror(root)
    const brokenDir = join(root, 'broken')
    mkdirSync(brokenDir, { recursive: true })
    const result = await runUpdateAll({ apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.total).toBe(2)
    expect(result.errors).toBe(1)
  })
})

describe('formatUpdateAllSummary', () => {
  const baseResult: UpdateAllResult = {
    total: 2,
    updated: 1,
    skipped: 0,
    errors: 1,
    clients: [
      { slug: 'client-a', status: 'updated', template: 'astro', added: 2, updated: 1, installed: true },
      { slug: 'client-b', status: 'error', reason: 'package.json missing' },
    ],
  }

  it('includes header, divider, rows, and summary line', () => {
    const lines = formatUpdateAllSummary(baseResult)
    expect(lines[0]).toMatch(/Client.*Template.*Pkg.*Status/)
    expect(lines.some((l) => l.includes('client-a') && l.includes('2+1~'))).toBe(true)
    expect(lines.some((l) => l.includes('client-b') && l.includes('error'))).toBe(true)
    expect(lines.some((l) => l.match(/Total: 2 \| Updated: 1 \| Skipped: 0 \| Errors: 1/))).toBe(true)
  })
})
