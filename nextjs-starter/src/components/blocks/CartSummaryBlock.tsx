'use client'
import type { CartSummaryBlock } from '@/lib/types'

interface CartSummaryBlockProps {
  data: CartSummaryBlock
}

export default function CartSummaryBlock({ data }: CartSummaryBlockProps) {
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
