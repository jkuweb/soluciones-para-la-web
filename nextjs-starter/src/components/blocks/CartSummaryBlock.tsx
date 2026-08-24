'use client'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import type { CartSummaryBlock as CartSummaryBlockType } from '@/lib/types'
import styles from '@/components/cart/styles.module.css'

interface CartSummaryBlockProps {
  data: CartSummaryBlockType
}

export default function CartSummaryBlock({ data }: CartSummaryBlockProps) {
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const empty = count === 0

  return (
    <div className={styles.cartSummaryBlock}>
      {empty ? (
        <p>{data.emptyMessage ?? 'Tu carrito está vacío'}</p>
      ) : (
        <p>Tienes {count} {count === 1 ? 'item' : 'items'} en tu carrito.</p>
      )}
      <Link href="/cart">{data.checkoutButton ?? 'Finalizar compra'}</Link>
    </div>
  )
}
