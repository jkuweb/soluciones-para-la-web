import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseSyncAllArgs, syncOneClient, MONOREPO_ROOT } from '../../../scripts/sync-clients'
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
    expect(result.reason).toBe('up-to-date')
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
      expect(result.reason).toMatch(/does not exist|Cannot detect/)
    }
  })
})
