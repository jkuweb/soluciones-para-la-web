export interface Page {
  id: string
  slug: string
  title: string
  layout: Block[]
  status: 'draft' | 'published'
  meta?: {
    title?: string
    description?: string
    image?: MediaImage
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
  cta?: Link
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

export interface MenuItem {
  name: string
  description?: string
  price?: number
  image?: MediaImage
}

export interface MenuBlock extends Block {
  blockType: 'menu'
  category?: string
  items?: MenuItem[]
}

export interface ContactBlock extends Block {
  blockType: 'contact'
  email?: string
  phone?: string
  address?: string
  mapUrl?: string
}

export interface CourseBlock extends Block {
  blockType: 'course'
  title: string
  description?: LexicalNode
  price?: number
  duration?: string
  lessons?: { title: string; videoUrl?: string; description?: string }[]
}

export interface FooterBlock extends Block {
  blockType: 'footer'
  copyright?: string
  socialLinks?: Link[]
}

export interface Header {
  navItems: { id: string; link: Link }[]
}

export interface Footer {
  navItems: { id: string; link: Link }[]
  copyright?: string
  socialLinks: { id: string; link: Link }[]
}
