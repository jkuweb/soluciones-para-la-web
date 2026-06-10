'use client'
import type { MenuBlock } from '@/lib/types'

interface MenuBlockProps {
  data: MenuBlock
}

export default function MenuBlock({ data }: MenuBlockProps) {
  return (
    <section className="menu-block">
      {data.category && <h2 className="category">{data.category}</h2>}
      {data.items && data.items.length > 0 && (
        <ul className="menu-items">
          {data.items.map((item, i) => (
            <li key={i} className="menu-item">
              {item.image && <img src={item.image} alt={item.name} loading="lazy" />}
              <div className="item-info">
                <h3>{item.name}</h3>
                {item.description && <p>{item.description}</p>}
                {item.price && <span className="price">{item.price}€</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .menu-block {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .category {
          font-size: 2rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .menu-items {
          list-style: none;
          display: grid;
          gap: 1.5rem;
        }
        .menu-item {
          display: flex;
          gap: 1rem;
          align-items: center;
          padding: 1rem;
          border: 1px solid #eee;
          border-radius: 8px;
        }
        .menu-item img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
        }
        .item-info h3 {
          margin-bottom: 0.5rem;
        }
        .price {
          font-weight: 700;
          color: var(--primary-color);
        }
      `}</style>
    </section>
  )
}
