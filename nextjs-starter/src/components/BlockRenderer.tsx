'use client'
import HeroBlock from '@/components/blocks/HeroBlock'
import TextBlock from '@/components/blocks/TextBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import ProductBlock from '@/components/blocks/ProductBlock'
import CartBlock from '@/components/blocks/CartBlock'
import CourseBlock from '@/components/blocks/CourseBlock'
import MenuBlock from '@/components/blocks/MenuBlock'
import ContactBlock from '@/components/blocks/ContactBlock'
import FooterBlock from '@/components/blocks/FooterBlock'

interface Block {
  blockType: string
  id?: string
  [key: string]: unknown
}

interface BlockRendererProps {
  layout: Block[]
}

const components: Record<string, React.ComponentType<{ data: unknown }>> = {
  hero: HeroBlock,
  text: TextBlock,
  image: ImageBlock,
  product: ProductBlock,
  cart: CartBlock,
  course: CourseBlock,
  menu: MenuBlock,
  contact: ContactBlock,
  footer: FooterBlock,
}

export default function BlockRenderer({ layout }: BlockRendererProps) {
  return (
    <>
      {layout.map((block) => {
        const Component = components[block.blockType]
        if (!Component) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[BlockRenderer] Unknown block type: "${block.blockType}"`)
          }
          return null
        }
        return <Component key={block.id} data={block} />
      })}
    </>
  )
}
