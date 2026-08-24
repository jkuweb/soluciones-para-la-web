'use client'
import { useState } from 'react'
import { useCartStore, type CartItem } from '@/store/cart'
import styles from './styles.module.css'

interface AddToCartButtonProps {
  product: {
    id: string | number
    title: string
    price: number
    currency: string
    images?: { url?: string }[]
  }
  tenantSlug: string
  label?: string
}

export default function AddToCartButton({ product, tenantSlug, label = 'Agregar al carrito' }: AddToCartButtonProps) {
  const add = useCartStore((s) => s.add)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleClick = () => {
    const item: CartItem = {
      productId: String(product.id),
      name: product.title,
      unitPrice: product.price,
      currency: product.currency,
      quantity: 1,
      imageUrl: product.images?.[0]?.url,
    }
    const result = add(item, tenantSlug)
    if (result.ok) {
      setFeedback('Agregado')
      setTimeout(() => setFeedback(null), 1500)
    } else {
      setFeedback(result.reason)
    }
  }

  return (
    <div>
      <button className={styles.addToCartBtn} onClick={handleClick} type="button">
        {feedback ?? label}
      </button>
    </div>
  )
}
