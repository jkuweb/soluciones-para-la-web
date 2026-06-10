'use client'
import type { CartBlock } from '@/lib/types'

interface CartBlockProps {
  data: CartBlock
}

export default function CartBlock({ data }: CartBlockProps) {
  return (
    <div className="cart-block">
      <p>{data.emptyMessage || 'Tu carrito está vacío'}</p>
      <button className="checkout-btn">
        {data.checkoutButton || 'Finalizar compra'}
      </button>
      <style jsx>{`
        .cart-block {
          padding: 2rem;
          text-align: center;
        }
        .checkout-btn {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
