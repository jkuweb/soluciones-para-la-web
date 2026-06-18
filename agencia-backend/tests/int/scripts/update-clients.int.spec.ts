import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseUpdateAllArgs, updateOneClient, MONOREPO_ROOT } from '../../../scripts/update-clients'

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
