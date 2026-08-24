'use client'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const tenantSlug = useCartStore((s) => s.tenantSlug)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/cart')
    }
  }, [items.length, router])

  if (items.length === 0) return null

  const currency = items[0].currency
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantSlug) {
      setError('No se detectó el tenant. Volvé al inicio.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, variantId: i.variantId })),
          email,
          tenantSlug,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'tenant_not_active') {
          setError('Este comercio no acepta pagos online todavía.')
        } else if (data.error === 'currency_mismatch') {
          setError('Tu carrito tiene items en monedas distintas. Limpiá el carrito.')
        } else {
          setError(`Error: ${data.error ?? 'desconocido'}`)
        }
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError('Error de red. Reintentá.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1>Checkout</h1>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Resumen</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={`${item.productId}::${item.variantId ?? ''}`}>
              {item.name} × {item.quantity} = {formatPrice(item.unitPrice * item.quantity, currency)}
            </li>
          ))}
        </ul>
        <strong>Total: {formatPrice(subtotal, currency)}</strong>
      </section>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--primary-color, #111)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: submitting ? 'wait' : 'pointer',
          }}
        >
          {submitting ? 'Procesando…' : 'Pagar con Stripe'}
        </button>
      </form>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/cart">← Volver al carrito</Link>
      </p>
    </main>
  )
}
