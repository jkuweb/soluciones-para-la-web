'use client'
import { useEffect } from 'react'
import { useCartStore } from '@/store/cart'

/**
 * Mounted in the root layout. Calls persist.rehydrate() after mount to
 * avoid SSR/hydration mismatches with skipHydration-friendly stores.
 */
export default function CartProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Rehydrate from localStorage after first paint
    void useCartStore.persist.rehydrate()
  }, [])
  return <>{children}</>
}
