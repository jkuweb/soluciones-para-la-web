import { findOrderById } from '@/lib/payload'
import Link from 'next/link'

interface PageProps {
  searchParams: { order_id?: string }
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const orderId = searchParams.order_id
  if (!orderId) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Pedido sin ID</h1>
        <p>No se pudo identificar el pedido. Contactanos si creés que es un error.</p>
      </main>
    )
  }

  const order = await findOrderById(orderId)

  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>¡Gracias por tu compra!</h1>
      {order ? (
        <div>
          <p>Tu número de orden es <strong>#{order.id}</strong>.</p>
          <p>Te enviamos la confirmación a <strong>{order.customerEmail}</strong>.</p>
          {order.status !== 'paid' && (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              Estamos procesando tu pago. Te avisaremos por email cuando se confirme.
            </p>
          )}
        </div>
      ) : (
        <p>Procesando tu pago…</p>
      )}
      <p style={{ marginTop: '2rem' }}>
        <Link href="/">Volver a la tienda</Link>
      </p>
    </main>
  )
}
