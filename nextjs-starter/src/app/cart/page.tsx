'use client'
import { useCartStore } from '@/store/cart'
import Link from 'next/link'
import styles from '@/components/cart/styles.module.css'

function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const updateQty = useCartStore((s) => s.updateQty)
  const remove = useCartStore((s) => s.remove)
  const clear = useCartStore((s) => s.clear)

  if (items.length === 0) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Tu carrito está vacío</h1>
        <p>
          <Link href="/">Volver a la tienda</Link>
        </p>
      </main>
    )
  }

  const currency = items[0].currency
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  return (
    <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>Tu carrito</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={`${item.productId}::${item.variantId ?? ''}`}
            style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem 0',
              borderBottom: '1px solid #eee',
              alignItems: 'center',
            }}
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <strong>{item.name}</strong>
              <div style={{ color: '#666', fontSize: '0.9em' }}>
                {formatPrice(item.unitPrice, currency)} c/u
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)}
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span style={{ margin: '0 0.5rem' }}>{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)}
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
            <button type="button" onClick={() => remove(item.productId, item.variantId)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <strong>Subtotal: {formatPrice(subtotal, currency)}</strong>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button type="button" onClick={() => clear()}>
          Vaciar carrito
        </button>
        <Link href="/checkout" className={styles.addToCartBtn} style={{ textDecoration: 'none' }}>
          Ir a checkout
        </Link>
      </div>
    </main>
  )
}
