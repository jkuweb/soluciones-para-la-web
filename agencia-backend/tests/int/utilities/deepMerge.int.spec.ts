import { describe, it, expect } from 'vitest'
import { deepMerge } from '@/utilities/deepMerge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>

describe('deepMerge', () => {
  it('merges simple objects', () => {
    const result = deepMerge<Obj>({ a: 1 }, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('nested objects merge recursively', () => {
    const result = deepMerge<Obj>({ nested: { a: 1 } }, { nested: { b: 2 } })
    expect(result).toEqual({ nested: { a: 1, b: 2 } })
  })

  it('source overrides target for same key', () => {
    const result = deepMerge<Obj>({ a: 1 }, { a: 2 })
    expect(result).toEqual({ a: 2 })
  })

  it('replaces plain arrays entirely', () => {
    const result = deepMerge<Obj>({ items: [1, 2] }, { items: [3, 4, 5] })
    expect(result).toEqual({ items: [3, 4, 5] })
  })

  it('merges object arrays by index', () => {
    const result = deepMerge<Obj>(
      { items: [{ name: 'a' }, { name: 'b' }] },
      { items: [{ value: 1 }] },
    )
    expect(result).toEqual({ items: [{ name: 'a', value: 1 }, { name: 'b' }] })
  })

  it('handles undefined source values', () => {
    const result = deepMerge<Obj>({ a: 1 }, { a: undefined })
    expect(result).toEqual({ a: 1 })
  })
})
