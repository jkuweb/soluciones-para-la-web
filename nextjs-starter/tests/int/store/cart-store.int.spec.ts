import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act } from 'react'

// Mock localStorage with a simple in-memory map
const localStorageMock = (() => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v }),
    removeItem: vi.fn((k: string) => { delete store[k] }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]) }),
    _store: store,
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true })

// Dynamic import so the store can be created fresh per test
const freshImport = async () => (await import('@/store/cart')).useCartStore

describe('cart store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('starts with empty items and null tenantSlug', async () => {
    const useCart = await freshImport()
    const { items, tenantSlug } = useCart.getState()
    expect(items).toEqual([])
    expect(tenantSlug).toBeNull()
  })

  it('add() stores an item and tenantSlug', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 2 },
        'tenant-a',
      )
    })
    const { items, tenantSlug } = useCart.getState()
    expect(items).toHaveLength(1)
    expect(items[0].productId).toBe('p1')
    expect(items[0].quantity).toBe(2)
    expect(tenantSlug).toBe('tenant-a')
  })

  it('add() rejects items from a different tenant (returns false, no mutation)', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 1 },
        'tenant-a',
      )
    })
    let result: { ok: boolean; reason?: string } = { ok: true }
    act(() => {
      result = useCart.getState().add(
        { productId: 'p2', name: 'Item 2', unitPrice: 500, currency: 'USD', quantity: 1 },
        'tenant-b',
      )
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/tenant/i)
    expect(useCart.getState().items).toHaveLength(1)
  })

  it('add() rejects items with a different currency', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 1 },
        'tenant-a',
      )
    })
    let result: { ok: boolean; reason?: string } = { ok: true }
    act(() => {
      result = useCart.getState().add(
        { productId: 'p2', name: 'Item 2', unitPrice: 500, currency: 'EUR', quantity: 1 },
        'tenant-a',
      )
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/moneda/i)
    expect(useCart.getState().items).toHaveLength(1)
  })

  it('add() merges same productId+variantId (increments quantity)', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 2 },
        'tenant-a',
      )
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 3 },
        'tenant-a',
      )
    })
    expect(useCart.getState().items).toHaveLength(1)
    expect(useCart.getState().items[0].quantity).toBe(5)
  })

  it('updateQty() changes quantity for matching productId', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 2 },
        'tenant-a',
      )
      useCart.getState().updateQty('p1', 7)
    })
    expect(useCart.getState().items[0].quantity).toBe(7)
  })

  it('updateQty() with qty <= 0 removes the item', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'Item 1', unitPrice: 1000, currency: 'USD', quantity: 2 },
        'tenant-a',
      )
      useCart.getState().updateQty('p1', 0)
    })
    expect(useCart.getState().items).toHaveLength(0)
  })

  it('remove() deletes the matching item', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'A', unitPrice: 100, currency: 'USD', quantity: 1 },
        't1',
      )
      useCart.getState().add(
        { productId: 'p2', name: 'B', unitPrice: 200, currency: 'USD', quantity: 1 },
        't1',
      )
      useCart.getState().remove('p1')
    })
    expect(useCart.getState().items).toHaveLength(1)
    expect(useCart.getState().items[0].productId).toBe('p2')
  })

  it('clear() empties the cart', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'A', unitPrice: 100, currency: 'USD', quantity: 1 },
        't1',
      )
      useCart.getState().clear()
    })
    expect(useCart.getState().items).toEqual([])
  })

  it('persists to localStorage under agencia-cart key with items and tenantSlug', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'A', unitPrice: 100, currency: 'USD', quantity: 1 },
        'tenant-a',
      )
    })
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'agencia-cart',
      expect.stringContaining('tenant-a'),
    )
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'agencia-cart',
      expect.stringContaining('p1'),
    )
  })

  it('add() rejects when switching to a different tenant (cart stays on original tenant)', async () => {
    const useCart = await freshImport()
    act(() => {
      useCart.getState().add(
        { productId: 'p1', name: 'A', unitPrice: 100, currency: 'USD', quantity: 1 },
        'tenant-a',
      )
    })
    // First write was under agencia-cart with tenant-a.
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'agencia-cart',
      expect.stringContaining('tenant-a'),
    )
    // Switching tenants must be rejected — cart keeps tenant-a items.
    let result: { ok: boolean } = { ok: true }
    act(() => {
      result = useCart.getState().add(
        { productId: 'p2', name: 'B', unitPrice: 200, currency: 'USD', quantity: 1 },
        'tenant-b',
      )
    })
    expect(result.ok).toBe(false)
    expect(useCart.getState().tenantSlug).toBe('tenant-a')
    expect(useCart.getState().items).toHaveLength(1)
    expect(useCart.getState().items[0].productId).toBe('p1')
  })
})
