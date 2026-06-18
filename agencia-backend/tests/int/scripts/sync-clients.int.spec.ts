import { describe, it, expect } from 'vitest'
import { parseSyncAllArgs } from '../../../scripts/sync-clients'

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
