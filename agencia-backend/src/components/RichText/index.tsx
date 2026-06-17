import React from 'react'

type LexicalNode = {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
  tag?: string
  listType?: string
  url?: string
  [key: string]: unknown
}

type Props = {
  data: {
    root: {
      children: LexicalNode[]
      [key: string]: unknown
    }
    [key: string]: unknown
  } | null
}

function serializeNode(node: LexicalNode, index: number): React.ReactNode {
  if (node.type === 'text') {
    let text: React.ReactNode = <React.Fragment key={index}>{node.text}</React.Fragment>

    const format = node.format ?? 0
    if (format & 1) text = <strong key={index}>{text}</strong>
    if (format & 2) text = <em key={index}>{text}</em>
    if (format & 8) text = <s key={index}>{text}</s>
    if (format & 16) text = <u key={index}>{text}</u>

    return text
  }

  if (!node.children) {
    return null
  }

  const children = node.children.map((child, i) => serializeNode(child, i))

  switch (node.type) {
    case 'paragraph':
      return <p key={index}>{children}</p>
    case 'heading': {
      const tag = node.tag ?? 'h2'
      const Tag = tag as keyof React.JSX.IntrinsicElements
      return <Tag key={index}>{children}</Tag>
    }
    case 'list': {
      const ListTag = node.listType === 'ordered' ? 'ol' : 'ul'
      return React.createElement(ListTag, { key: index }, children)
    }
    case 'listitem':
      return <li key={index}>{children}</li>
    case 'quote':
      return <blockquote key={index}>{children}</blockquote>
    case 'link':
      return (
        <a key={index} href={node.url ?? '#'}>
          {children}
        </a>
      )
    default:
      return <span key={index}>{children}</span>
  }
}

const RichText: React.FC<Props> = ({ data }) => {
  if (!data?.root?.children) {
    return null
  }

  return (
    <div className="rich-text">
      {data.root.children.map((child, i) => serializeNode(child, i))}
    </div>
  )
}

export default RichText
