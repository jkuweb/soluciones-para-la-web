import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  productId: string
  variantId?: string
  name: string
  unitPrice: number
  currency: string
  quantity: number
  imageUrl?: string
}

export type AddResult = { ok: true } | { ok: false; reason: string }

export interface CartState {
  tenantSlug: string | null
  items: CartItem[]
  add: (item: CartItem, tenantSlug: string) => AddResult
  remove: (productId: string, variantId?: string) => void
  updateQty: (productId: string, qty: number, variantId?: string) => void
  clear: () => void
}

const itemKey = (productId: string, variantId?: string): string =>
  variantId ? `${productId}::${variantId}` : productId

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantSlug: null,
      items: [],

      add: (item, tenantSlug) => {
        const { items, tenantSlug: currentTenant } = get()
        if (currentTenant !== null && currentTenant !== tenantSlug) {
          return {
            ok: false,
            reason: `Tu carrito tiene items de "${currentTenant}". Limpiá el carrito para empezar de nuevo.`,
          }
        }
        if (items.length > 0 && items[0].currency !== item.currency) {
          return {
            ok: false,
            reason: `Tu carrito está en ${items[0].currency}, no se pueden mezclar monedas (${item.currency}).`,
          }
        }

        const key = itemKey(item.productId, item.variantId)
        const existing = items.find(
          (i) => itemKey(i.productId, i.variantId) === key,
        )
        const next: CartItem[] = existing
          ? items.map((i) =>
              itemKey(i.productId, i.variantId) === key
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            )
          : [...items, item]
        set({ items: next, tenantSlug })
        return { ok: true }
      },

      remove: (productId, variantId) => {
        const key = itemKey(productId, variantId)
        set((s) => ({
          items: s.items.filter((i) => itemKey(i.productId, i.variantId) !== key),
        }))
      },

      updateQty: (productId, qty, variantId) => {
        const key = itemKey(productId, variantId)
        if (qty <= 0) {
          set((s) => ({
            items: s.items.filter((i) => itemKey(i.productId, i.variantId) !== key),
          }))
          return
        }
        set((s) => ({
          items: s.items.map((i) =>
            itemKey(i.productId, i.variantId) === key ? { ...i, quantity: qty } : i,
          ),
        }))
      },

      clear: () => set({ items: [], tenantSlug: null }),
    }),
    {
      name: 'agencia-cart', // base; we'll override per-tenant via partialize + custom key
      storage: createJSONStorage(() => {
        // SSR-safe: return a noop storage when window/localStorage missing.
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          }
        }
        return window.localStorage
      }),
      partialize: (state) => ({ items: state.items, tenantSlug: state.tenantSlug }),
      // Dynamic key per tenant
      merge: (persisted, current) => {
        const p = persisted as Partial<CartState> | undefined
        if (!p) return current
        return {
          ...current,
          items: Array.isArray(p.items) ? p.items : [],
          tenantSlug: p.tenantSlug ?? null,
        }
      },
    },
  ),
)
