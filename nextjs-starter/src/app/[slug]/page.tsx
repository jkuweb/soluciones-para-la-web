import { getPages, getPageBySlug } from '@/lib/payload'
import HeroBlock from '@/components/blocks/HeroBlock'
import TextBlock from '@/components/blocks/TextBlock'
import ImageBlock from '@/components/blocks/ImageBlock'
import ProductBlock from '@/components/blocks/ProductBlock'
import CartBlock from '@/components/blocks/CartBlock'
import CourseBlock from '@/components/blocks/CourseBlock'
import MenuBlock from '@/components/blocks/MenuBlock'
import ContactBlock from '@/components/blocks/ContactBlock'
import FooterBlock from '@/components/blocks/FooterBlock'

export async function generateStaticParams() {
  const pages = await getPages()
  return pages.map((page) => ({
    slug: page.slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug)
  return {
    title: page?.meta?.title || page?.title,
    description: page?.meta?.description,
  }
}

const components = {
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

export default async function Page({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug)

  if (!page) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '6rem', marginBottom: '1rem' }}>404</h1>
        <p>La página que buscas no existe.</p>
      </div>
    )
  }

  return (
    <article>
      {page.layout.map((block) => {
        const blockType = block.blockType as keyof typeof components
        const Component = components[blockType]
        if (!Component) return null
        return <Component key={block.id} data={block as never} />
      })}
    </article>
  )
}
