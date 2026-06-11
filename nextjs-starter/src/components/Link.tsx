import type { Page } from '@/lib/types'

interface LinkProps {
  link: {
    type?: 'reference' | 'custom'
    reference?: {
      relationTo: string
      value: Page | string | number
    }
    url?: string
    label?: string
    newTab?: boolean
  }
  className?: string
  children?: React.ReactNode
}

export default function Link({ link, className, children }: LinkProps) {
  const href =
    link.type === 'reference' &&
    typeof link.reference?.value === 'object' &&
    (link.reference.value as Page).slug
      ? `/${(link.reference.value as Page).slug}`
      : link.url

  if (!href) return null

  const newTabProps = link.newTab
    ? { rel: 'noopener noreferrer', target: '_blank' }
    : {}

  return (
    <a href={href} className={className} {...newTabProps}>
      {children || link.label}
    </a>
  )
}
