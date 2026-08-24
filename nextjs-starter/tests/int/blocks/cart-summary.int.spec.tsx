import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CartSummaryBlock from '@/components/blocks/CartSummaryBlock'

// Mock cart store
const mockCartStore: { items: { productId: string; quantity: number }[] } = { items: [] }

vi.mock('@/store/cart', () => ({
  useCartStore: (selector: any) => selector(mockCartStore),
}))

describe('CartSummaryBlock', () => {
  beforeEach(() => {
    mockCartStore.items = []
  })

  it('renders empty message when cart is empty', () => {
    render(<CartSummaryBlock data={{ id: 'b1', blockType: 'cart-summary', emptyMessage: 'Vacío' }} />)
    expect(screen.getByText('Vacío')).toBeInTheDocument()
  })

  it('renders item count when cart has items', () => {
    mockCartStore.items = [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 3 },
    ]
    render(<CartSummaryBlock data={{ id: 'b1', blockType: 'cart-summary' }} />)
    expect(screen.getByText(/5 items/)).toBeInTheDocument()
  })

  it('uses singular "item" for count of 1', () => {
    mockCartStore.items = [{ productId: 'p1', quantity: 1 }]
    render(<CartSummaryBlock data={{ id: 'b1', blockType: 'cart-summary' }} />)
    expect(screen.getByText(/1 item/)).toBeInTheDocument()
  })

  it('renders checkout link with the configured label', () => {
    render(<CartSummaryBlock data={{ id: 'b1', blockType: 'cart-summary', checkoutButton: 'Pagar ahora' }} />)
    const link = screen.getByRole('link', { name: /Pagar ahora/ })
    expect(link).toHaveAttribute('href', '/cart')
  })
})
