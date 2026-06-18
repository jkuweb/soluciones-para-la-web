import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseSyncAllArgs, syncOneClient, runSyncAll, formatSyncAllSummary, type SyncAllResult, MONOREPO_ROOT } from '../../../scripts/sync-clients'
import { getAllowlist } from '../../../scripts/sync-template'

describe('parseSyncAllArgs', () => {
  it('returns defaults when no args given', () => {
    expect(parseSyncAllArgs([])).toEqual({ apply: false, filter: 'all' })
  })

  it('parses --apply', () => {
    expect(parseSyncAllArgs(['--apply']).apply).toBe(true)
  })

  it('parses --filter=outdated and --filter=all', () => {
    expect(parseSyncAllArgs(['--filter=outdated']).filter).toBe('outdated')
    expect(parseSyncAllArgs(['--filter=all']).filter).toBe('all')
  })

  it('rejects invalid --filter value', () => {
    expect(() => parseSyncAllArgs(['--filter=foo'])).toThrow(/Invalid --filter/)
  })

  it('parses --template=astro and --template=nextjs', () => {
    expect(parseSyncAllArgs(['--template=astro']).template).toBe('astro')
    expect(parseSyncAllArgs(['--template=nextjs']).template).toBe('nextjs')
  })

  it('rejects invalid --template value', () => {
    expect(() => parseSyncAllArgs(['--template=svelte'])).toThrow(/Invalid --template/)
  })

  it('rejects unknown argument', () => {
    expect(() => parseSyncAllArgs(['--weird'])).toThrow(/Unknown argument/)
  })
})

const ASTRO_TEMPLATE = join(MONOREPO_ROOT, 'astro-starter')
const NEXTJS_TEMPLATE = join(MONOREPO_ROOT, 'nextjs-starter')

const setupClientMirror = (root: string, templateType: 'astro' | 'nextjs' = 'astro'): string => {
  const clientDir = join(root, 'client-x')
  mkdirSync(clientDir, { recursive: true })
  const templateDir = templateType === 'astro' ? ASTRO_TEMPLATE : NEXTJS_TEMPLATE
  const pkg = JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf-8'))
  writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))
  for (const relPath of getAllowlist(templateType)) {
    const src = join(templateDir, relPath)
    const dest = join(clientDir, relPath)
    mkdirSync(join(dest, '..'), { recursive: true })
    copyFileSync(src, dest)
  }
  return clientDir
}

describe('syncOneClient', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sync-one-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns "skipped" when client mirrors the template', async () => {
    setupClientMirror(root)
    const result = await syncOneClient('client-x', { apply: false, filter: 'all' }, root)
    expect(result.status).toBe('skipped')
    if (result.status === 'skipped') {
      expect(result.reason).toBe('up-to-date')
    }
  })

  it('returns "updated" when client has different files', async () => {
    const clientDir = setupClientMirror(root)
    writeFileSync(join(clientDir, 'astro.config.mjs'), '// changed')
    const result = await syncOneClient('client-x', { apply: false, filter: 'all' }, root)
    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.filesChanged).toBe(1)
    }
  })

  it('returns "error" when client dir does not exist', async () => {
    const result = await syncOneClient('missing', { apply: false, filter: 'all' }, root)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.reason).toMatch(/does not exist|Cannot detect|ENOENT/)
    }
  })
})

describe('runSyncAll', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'run-sync-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns empty result when no clients found', async () => {
    const result = await runSyncAll({ apply: false, filter: 'all' }, root)
    expect(result.total).toBe(0)
    expect(result.clients).toEqual([])
  })

  it('processes all clients by default (filter=all)', async () => {
    setupClientMirror(root)
    const result = await runSyncAll({ apply: false, filter: 'all' }, root)
    expect(result.total).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('processes outdated clients when filter=outdated', async () => {
    const clientDir = setupClientMirror(root)
    writeFileSync(join(clientDir, 'astro.config.mjs'), '// changed')
    const result = await runSyncAll({ apply: false, filter: 'outdated' }, root)
    expect(result.total).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it('skips client entirely when filter=outdated and no changes', async () => {
    setupClientMirror(root)
    const result = await runSyncAll({ apply: false, filter: 'outdated' }, root)
    expect(result.total).toBe(1)
    expect(result.clients).toEqual([]) // filtered out
  })

  it('counts skipped clients even when filter=outdated excludes them from clients', async () => {
    // client-x mirrors the template (will be skipped)
    setupClientMirror(root)
    // Add a second client with a different file (will be updated)
    const clientY = join(root, 'client-y')
    mkdirSync(clientY, { recursive: true })
    writeFileSync(join(clientY, 'package.json'), '{"name":"astro-starter"}')
    writeFileSync(join(clientY, 'astro.config.mjs'), '// changed')

    const result = await runSyncAll({ apply: false, filter: 'outdated' }, root)
    expect(result.total).toBe(2)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(1) // counted even though excluded from clients
    expect(result.errors).toBe(0)
    expect(result.clients.length).toBe(1) // only the updated client is in the array
  })

  it('continues on error and counts it', async () => {
    setupClientMirror(root)
    // Add a second client that will fail
    const brokenDir = join(root, 'broken')
    mkdirSync(brokenDir, { recursive: true })
    // No package.json - will fail
    const result = await runSyncAll({ apply: false, filter: 'all' }, root)
    expect(result.total).toBe(2)
    expect(result.errors).toBe(1)
    expect(result.skipped).toBe(1)
  })
})

describe('formatSyncAllSummary', () => {
  const baseResult: SyncAllResult = {
    total: 3,
    updated: 1,
    skipped: 1,
    errors: 1,
    clients: [
      { slug: 'client-a', status: 'updated', template: 'astro', filesChanged: 2, filesAdded: 1 },
      { slug: 'client-b', status: 'skipped', reason: 'up-to-date' },
      { slug: 'client-c', status: 'error', reason: 'package.json missing' },
    ],
  }

  it('includes header, divider, rows, and summary line', () => {
    const lines = formatSyncAllSummary(baseResult)
    expect(lines[0]).toMatch(/Client.*Template.*Files.*Status/)
    expect(lines[1]).toMatch(/----/)
    expect(lines.some((l) => l.includes('client-a') && l.includes('2c+1a'))).toBe(true)
    expect(lines.some((l) => l.includes('client-b') && l.includes('up-to-date'))).toBe(true)
    expect(lines.some((l) => l.includes('client-c') && l.includes('error'))).toBe(true)
    expect(lines.some((l) => l.match(/Total: 3 \| Updated: 1 \| Skipped: 1 \| Errors: 1/))).toBe(true)
  })

  it('handles empty result set', () => {
    const lines = formatSyncAllSummary({ total: 0, updated: 0, skipped: 0, errors: 0, clients: [] })
    expect(lines.some((l) => l.match(/Total: 0/))).toBe(true)
  })
})
