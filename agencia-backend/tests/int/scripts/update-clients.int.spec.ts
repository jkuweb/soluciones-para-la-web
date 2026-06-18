import { describe, it, expect } from 'vitest'
import { parseUpdateAllArgs } from '../../../scripts/update-clients'

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
