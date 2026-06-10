'use client'
import type { ProductBlock } from '@/lib/types'

interface ProductBlockProps {
  data: ProductBlock
}

export default function ProductBlock({ data }: ProductBlockProps) {
  return (
    <div className="product-block">
      <h3>{data.name}</h3>
      {data.description && <p>{data.description}</p>}
      <span className="price">{data.price}€</span>
      {data.stock !== undefined && data.stock > 0 && (
        <p className="stock">En stock: {data.stock}</p>
      )}
      {data.images && data.images.length > 0 && (
        <div className="product-images">
          {data.images.map((img, i) => (
            <img key={i} src={img} alt={data.name} loading="lazy" />
          ))}
        </div>
      )}
      <style jsx>{`
        .product-block {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1rem;
        }
        .product-block h3 {
          margin-bottom: 0.5rem;
        }
        .price {
          font-weight: 700;
          color: var(--primary-color);
          font-size: 1.25rem;
        }
        .stock {
          color: var(--secondary-color);
        }
        .product-images {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .product-images img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
