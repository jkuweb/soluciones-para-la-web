import Link from 'next/link'

export default function CheckoutCancelPage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Pago cancelado</h1>
      <p>No se realizó ningún cargo. Tu carrito sigue intacto.</p>
      <p>
        <Link href="/cart">← Volver al carrito</Link>
      </p>
    </main>
  )
}
