/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest'
import { anyone } from '@/access/anyone'
import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'
import { tenantAccess } from '@/access/tenantAccess'

describe('anyone', () => {
  it('returns true', () => {
    expect(anyone({ req: {} } as any)).toBe(true)
  })
})

describe('authenticated', () => {
  it('returns false when no user', () => {
    expect(authenticated({ req: { user: null } } as any)).toBe(false)
  })

  it('returns true when user exists', () => {
    expect(authenticated({ req: { user: { id: '1' } } } as any)).toBe(true)
  })
})

describe('authenticatedOrPublished', () => {
  it('returns true for authenticated user', () => {
    const result = authenticatedOrPublished({ req: { user: { id: '1' } } } as any)
    expect(result).toBe(true)
  })

  it('returns published filter for public', () => {
    const result = authenticatedOrPublished({ req: { user: null } } as any)
    expect(result).toEqual({ _status: { equals: 'published' } })
  })
})

describe('tenantAccess', () => {
  it('returns false for unauthenticated', () => {
    const access = tenantAccess()
    expect(access({ req: { user: null } } as any)).toBe(false)
  })

  it('returns true for super-admin', () => {
    const access = tenantAccess()
    expect(access({ req: { user: { roles: ['super-admin'] } } } as any)).toBe(true)
  })

  it('returns tenant filter for tenant users', () => {
    const access = tenantAccess()
    const user = {
      roles: ['tenant-admin'],
      tenants: [{ tenant: 'tenant_1' }, { tenant: 'tenant_2' }],
    }
    const result = access({ req: { user } } as any)
    expect(result).toEqual({ tenant: { in: ['tenant_1', 'tenant_2'] } })
  })

  it('supports custom field name', () => {
    const access = tenantAccess({ fieldName: 'id' })
    const user = {
      roles: ['tenant-admin'],
      tenants: [{ tenant: 'tenant_1' }],
    }
    const result = access({ req: { user } } as any)
    expect(result).toEqual({ id: { in: ['tenant_1'] } })
  })

  it('returns false for tenant users with no tenants', () => {
    const access = tenantAccess()
    const user = { roles: ['tenant-admin'], tenants: [] }
    expect(access({ req: { user } } as any)).toBe(false)
  })
})
