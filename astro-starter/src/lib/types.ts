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

export interface HeroBlock extends Block {
  blockType: 'hero'
  title: string
  subtitle?: string
  backgroundImage?: MediaImage
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

export interface FooterBlock extends Block {
  blockType: 'footer'
  copyright?: string
  socialLinks?: { platform: string; url: string }[]
}
