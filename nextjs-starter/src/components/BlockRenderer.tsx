'use client'
import HeroBlock from '@/components/HeroBlock'
import TextBlock from '@/components/blocks/TextBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import ProductBlock from '@/components/blocks/ProductBlock'
import CartBlock from '@/components/blocks/CartBlock'
import CourseBlock from '@/components/blocks/CourseBlock'
import MenuBlock from '@/components/blocks/MenuBlock'
import ContactBlock from '@/components/blocks/ContactBlock'
import ProductGridBlock from '@/components/blocks/ProductGrid'
import FeaturedProductBlock from '@/components/blocks/FeaturedProduct'
import CategoryListBlock from '@/components/blocks/CategoryList'

interface Block {
  blockType: string
  id?: string
  [key: string]: unknown
}

interface BlockRendererProps {
  hero?: Block[]
  layout: Block[]
  /**
   * Map of feature keys to whether they are enabled for the current tenant.
   * Defaults to all true if omitted (legacy callers, e.g. preview).
   */
  features?: Record<string, boolean>
}

/**
 * Block slug → required feature key. Blocks not listed here are always
 * available regardless of feature flags.
 */
const BLOCK_FEATURE_REQUIREMENT: Record<string, string> = {
  'product-grid': 'catalog',
  'featured-product': 'catalog',
  'category-list': 'catalog',
}

const components: Record<string, React.ComponentType<{ data: any }>> = {
  hero: HeroBlock,
  text: TextBlock,
  image: ImageBlock,
  product: ProductBlock,
  cart: CartBlock,
  course: CourseBlock,
  menu: MenuBlock,
  contact: ContactBlock,
  'product-grid': ProductGridBlock,
  'featured-product': FeaturedProductBlock,
  'category-list': CategoryListBlock,
}

function isBlockEnabled(block: Block, features?: Record<string, boolean>): boolean {
  const required = BLOCK_FEATURE_REQUIREMENT[block.blockType]
  if (!required) return true
  if (!features) return true // legacy: assume enabled
  return features[required] === true
}

function renderBlock(block: Block, features?: Record<string, boolean>) {
  if (!isBlockEnabled(block, features)) {
    if (process.env.NODE_ENV === 'development') {
      const required = BLOCK_FEATURE_REQUIREMENT[block.blockType]
      console.warn(
        `[BlockRenderer] Skipping block "${block.blockType}" because feature "${required}" is disabled.`,
      )
    }
    return null
  }
  const Component = components[block.blockType]
  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[BlockRenderer] Unknown block type: "${block.blockType}"`)
    }
    return null
  }
  return <Component key={block.id} data={block} />
}

export default function BlockRenderer({ hero, layout, features }: BlockRendererProps) {
  return (
    <article>
      {hero?.map((b) => renderBlock(b, features))}
      {layout.map((b) => renderBlock(b, features))}
    </article>
  )
}
