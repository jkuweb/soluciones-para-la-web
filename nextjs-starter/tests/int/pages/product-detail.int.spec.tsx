import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import ProductPage from '@/app/product/[slug]/page'

// AddToCartButton is a client component that uses the cart store.
// Mock the store with a minimal shape — the page only needs the initial
// render, and the button's click handler is never invoked in this test.
const mockCartStore: { items: unknown[]; tenantSlug: string | null } = {
  items: [],
  tenantSlug: null,
}
vi.mock('@/store/cart', () => ({
  useCartStore: (selector: (state: typeof mockCartStore) => unknown) => selector(mockCartStore),
}))

vi.mock('@/lib/payload', () => ({
  TENANT_SLUG: 'mood',
  getProductBySlug: vi.fn(),
  getMediaUrl: (url: string) => url,
}))

vi.mock('@/lib/tenant', () => ({
  getTenantFeatures: () => ({ catalog: true, payments: true }),
}))

describe('Product detail page', () => {
  beforeEach(async () => {
    const { getProductBySlug } = await import('@/lib/payload')
    ;(getProductBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1',
      title: 'Test Product',
      slug: 'test-product',
      price: 1999,
      currency: 'USD',
      images: [],
    })
  })

  it('renders an enabled AddToCartButton instead of the disabled "coming soon" button', async () => {
    const element = await ProductPage({
      params: Promise.resolve({ slug: 'test-product' }),
    })
    const html = renderToString(element)

    // AddToCartButton's default label is "Agregar al carrito" — this proves
    // the wired-up component is rendering (not the old "Añadir al carrito").
    expect(html).toContain('Agregar al carrito')

    // The old "coming soon" hint must be gone.
    expect(html).not.toContain('El carrito llega en el feature')

    // The add-to-cart button must not be disabled.
    expect(html).not.toContain('disabled')
  })
})
