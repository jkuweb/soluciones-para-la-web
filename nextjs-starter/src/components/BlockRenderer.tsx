'use client'
import Hero from '@/heros/Hero'
import TextBlock from '@/components/blocks/TextBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import ProductBlock from '@/components/blocks/ProductBlock'
import CartBlock from '@/components/blocks/CartBlock'
import CourseBlock from '@/components/blocks/CourseBlock'
import MenuBlock from '@/components/blocks/MenuBlock'
import ContactBlock from '@/components/blocks/ContactBlock'

interface Block {
  blockType: string
  id?: string
  [key: string]: unknown
}

interface BlockRendererProps {
  hero?: Block[]
  layout: Block[]
}

const components: Record<string, React.ComponentType<{ data: any }>> = {
  hero: Hero,
  text: TextBlock,
  image: ImageBlock,
  product: ProductBlock,
  cart: CartBlock,
  course: CourseBlock,
  menu: MenuBlock,
  contact: ContactBlock,
}

function renderBlock(block: Block) {
  const Component = components[block.blockType]
  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[BlockRenderer] Unknown block type: "${block.blockType}"`)
    }
    return null
  }
  return <Component key={block.id} data={block} />
}

export default function BlockRenderer({ hero, layout }: BlockRendererProps) {
  return (
    <article>
      {hero?.map(renderBlock)}
      {layout.map(renderBlock)}
    </article>
  )
}
