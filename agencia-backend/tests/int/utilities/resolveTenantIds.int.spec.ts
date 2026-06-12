/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest'
import { resolveTenantIds } from '@/utilities/resolveTenantIds'

describe('resolveTenantIds', () => {
  it('returns empty array for null user', () => {
    expect(resolveTenantIds(null)).toEqual([])
  })

  it('returns empty array for undefined user', () => {
    expect(resolveTenantIds(undefined)).toEqual([])
  })

  it('returns empty array for user with no tenants', () => {
    expect(resolveTenantIds({} as any)).toEqual([])
  })

  it('extracts string tenant IDs', () => {
    const user = {
      tenants: [
        { tenant: 'tenant_1' },
        { tenant: 'tenant_2' },
      ],
    }
    expect(resolveTenantIds(user as any)).toEqual(['tenant_1', 'tenant_2'])
  })

  it('extracts number tenant IDs', () => {
    const user = {
      tenants: [
        { tenant: 1 },
        { tenant: 2 },
      ],
    }
    expect(resolveTenantIds(user as any)).toEqual([1, 2])
  })

  it('extracts populated tenant IDs from objects', () => {
    const user = {
      tenants: [
        { tenant: { id: 'tenant_1' } },
        { tenant: { id: 42 } },
      ],
    }
    expect(resolveTenantIds(user as any)).toEqual(['tenant_1', 42])
  })

  it('handles mixed formats', () => {
    const user = {
      tenants: [
        { tenant: 'abc' },
        { tenant: { id: 123 } },
        { tenant: 456 },
      ],
    }
    expect(resolveTenantIds(user as any)).toEqual(['abc', 123, 456])
  })

  it('skips null/undefined tenant entries', () => {
    const user = {
      tenants: [
        { tenant: null },
        { tenant: 'valid-id' },
        { tenant: undefined },
      ],
    }
    expect(resolveTenantIds(user as any)).toEqual(['valid-id'])
  })
})
