export interface Page {
  id: string
  slug: string
  title: string
  hero?: Block[]
  layout: Block[]
  meta?: {
    title?: string
    description?: string
    image?: { url?: string }
  }
}

export interface Block {
  id: string
  blockType: string
  [key: string]: unknown
}

export interface MediaImage {
  id: string
  url: string
  alt: string
  filename?: string
  mimeType?: string
  filesize?: number
  width?: number
  height?: number
  sizes?: {
    thumbnail?: { url: string; width: number; height: number }
    card?: { url: string; width: number; height: number }
    hero?: { url: string; width: number; height: number }
  }
}

export interface Link {
  type?: 'reference' | 'custom'
  reference?: {
    relationTo: string
    value: Page | string | number
  }
  url?: string
  label?: string
  newTab?: boolean
}

export interface HeroBlock extends Block {
  blockType: 'hero'
  title: string
  subtitle?: string
  backgroundImage?: MediaImage
  information?: string
  cta?: { id?: string; link: Link }[]
  images?: { id?: string; image: MediaImage }[]
}

export interface TextBlock extends Block {
  blockType: 'text'
  heading?: string
  content: LexicalNode
}

export interface LexicalNode {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
  direction?: string
  indent?: number
  version?: number
  style?: string
  detail?: number
  mode?: string
  tag?: string
  listType?: string
  start?: number
  url?: string
}

export interface ImageBlock extends Block {
  blockType: 'image'
  image: MediaImage
  caption?: string
}

export interface ProductBlock extends Block {
  blockType: 'product'
  name: string
  description?: string
  price: number
  images?: MediaImage[]
  stock?: number
  category?: string
}

export interface CartSummaryBlock extends Block {
  blockType: 'cart-summary'
  emptyMessage?: string
  checkoutButton?: string
}

export interface CourseBlock extends Block {
  blockType: 'course'
  title: string
  description?: string
  price?: number
  duration?: string
  lessons?: { title: string; videoUrl?: string; description?: string }[]
}

export interface ContactBlock extends Block {
  blockType: 'contact'
  email?: string
  phone?: string
  address?: string
  mapUrl?: string
}

export interface MenuBlock extends Block {
  blockType: 'menu'
  category?: string
  items?: { name: string; description?: string; price?: number; image?: MediaImage }[]
}

export interface WelcomeBanner extends Block {
  blockType: 'welcome-banner'
  text?: string
  enabled?: boolean
}

export interface Header {
  id: string
  tenant: string | { slug: string }
  createdAt: string
  updatedAt: string
  /**
   * 'simple' renders every nav item as a flat link, ignoring any subItems
   * present in the data. 'withSubItems' (or undefined for legacy headers)
   * keeps the mega-menu behaviour. Controlled by super-admin only.
   */
  navigationType?: 'simple' | 'withSubItems'
  navItems?: {
    id?: string
    title: string
    link?: Link
    subItems?: {
      id?: string
      title: string
      description?: string
      enableImage?: boolean
      image?: MediaImage
      link?: Link
    }[]
  }[]
  logo?: { id: string; url: string; alt: string }
  ctaText?: string
  ctaLink?: Link
}

export interface Footer {
  id: string
  tenant: string | { slug: string }
  createdAt: string
  updatedAt: string
  copyright?: string
  navItems: { id: string; link: Link }[]
  socialLinks: { id: string; link: Link }[]
  navColumns: {
    id: string
    title: string
    links: { id: string; link: Link }[]
  }[]
}

// ── Blog types ──────────────────────────────────────────────────────────────

export interface Post {
  id: string
  slug: string
  title: string
  heroImage: MediaImage
  content: LexicalNode | { root: LexicalNode }
  categories?: { id: string; title: string; slug: string }[]
  tags?: { id: string; title: string; slug: string }[]
  publishedAt: string
  excerpt?: string
  metaTitle?: string
  metaDescription?: string
  metaImage?: MediaImage
}

export interface Category {
  id: string
  title: string
  slug: string
}

export interface Tag {
  id: string
  title: string
  slug: string
}

// ── Catalog types ────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string
  slug: string
  name: string
  description?: string
  image?: MediaImage
}

export interface Product {
  id: string
  slug: string
  title: string
  description?: LexicalNode | { root: LexicalNode }
  price: number
  compareAtPrice?: number
  currency: 'EUR' | 'USD' | 'GBP'
  images?: { id?: string; image: MediaImage }[]
  category?: { id: string; slug: string; name: string } | string
  stock?: number
  sku?: string
  status: 'draft' | 'published' | 'archived'
}

export interface ProductGrid extends Block {
  blockType: 'product-grid'
  heading?: string
  category?: { id: string; slug: string; name: string } | string
  limit?: number
  columns?: '2' | '3' | '4'
}

export interface FeaturedProduct extends Block {
  blockType: 'featured-product'
  product: Product | string
  showPrice?: boolean
  ctaLabel?: string
}

export interface CategoryList extends Block {
  blockType: 'category-list'
  heading?: string
  layout?: 'grid' | 'list'
}

// ── Payments / Orders types ───────────────────────────────────────────────────

export interface OrderItem {
  productId: string
  variantId?: string
  name: string
  unitPrice: number
  quantity: number
  imageUrl?: string
}

export interface Order {
  id: string
  tenant: string | { id: string }
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  stripeSessionId?: string
  stripePaymentIntentId?: string
  paidAt?: string
  failedReason?: string
  createdAt: string
  updatedAt: string
}

// NOTE: `CartItem` is defined in `@/store/cart` (Task 7). Do NOT redefine
// it here — adding a duplicate `CartItem` in this file causes a type
// collision when both modules are imported. If you need a "Cart-shaped"
// type in code that doesn't import from the store, import it as:
//   import type { CartItem } from '@/store/cart'
