'use client'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import styles from './styles.module.css'

export default function CartBadge({ href = '/cart', label = 'Carrito' }: { href?: string; label?: string }) {
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  return (
    <Link href={href} className={styles.cartBadge} aria-label={`${label} (${count} items)`}>
      <span>{label}</span>
      <span className={styles.cartBadgeCount}>{count}</span>
    </Link>
  )
}
