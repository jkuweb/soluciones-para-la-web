export interface Page {
  id: string
  slug: string
  title: string
  layout: Block[]
  status: 'draft' | 'published'
  meta?: {
    title?: string
    description?: string
  }
}

export interface Block {
  id: string
  blockType: string
  [key: string]: unknown
}

export interface HeroBlock extends Block {
  blockType: 'hero'
  title: string
  subtitle?: string
  backgroundImage?: string
  ctaText?: string
  ctaLink?: string
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
  image: string
  caption?: string
}

export interface ProductBlock extends Block {
  blockType: 'product'
  name: string
  description?: string
  price: number
  images?: string[]
  stock?: number
  category?: string
}

export interface CartBlock extends Block {
  blockType: 'cart'
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

export interface MenuBlock extends Block {
  blockType: 'menu'
  category?: string
  items?: { name: string; description?: string; price?: number; image?: string }[]
}

export interface FooterBlock extends Block {
  blockType: 'footer'
  copyright?: string
  socialLinks?: { platform: string; url: string }[]
}
