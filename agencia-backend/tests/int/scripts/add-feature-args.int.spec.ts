import { describe, it, expect } from 'vitest'
import { parseArgs } from '../../../scripts/add-feature'

describe('add-feature parseArgs', () => {
  it('parses feature positional arg', () => {
    expect(parseArgs(['shipping'])).toEqual({
      feature: 'shipping',
      slug: undefined,
      status: false,
      remove: false,
      filter: undefined,
    })
  })

  it('parses --slug flag', () => {
    expect(parseArgs(['shipping', '--slug=mood'])).toMatchObject({
      feature: 'shipping',
      slug: 'mood',
    })
  })

  it('parses --status', () => {
    expect(parseArgs(['--status', '--slug=mood']).status).toBe(true)
  })

  it('parses --remove', () => {
    expect(parseArgs(['shipping', '--slug=mood', '--remove']).remove).toBe(true)
  })

  it('parses --filter', () => {
    expect(parseArgs(['--status', '--filter=ecommerce-tier:standard']).filter).toBe(
      'ecommerce-tier:standard',
    )
  })

  it('returns empty result for empty argv', () => {
    expect(parseArgs([])).toEqual({
      feature: undefined,
      slug: undefined,
      status: false,
      remove: false,
      filter: undefined,
    })
  })

  it('ignores args after the first positional', () => {
    expect(parseArgs(['shipping', 'extra']).feature).toBe('shipping')
  })
})
