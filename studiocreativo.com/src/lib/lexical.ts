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

export function serializeLexical(node: LexicalNode | { root: LexicalNode }): string {
  const unwrapped = 'root' in node ? (node as { root: LexicalNode }).root : (node as LexicalNode)
  return serializeNode(unwrapped)
}

function serializeNode(node: LexicalNode): string {
  if (node.type === 'root') {
    return node.children?.map(serializeNode).join('') || ''
  }

  if (node.type === 'paragraph') {
    const children = node.children?.map(serializeNode).join('') || ''
    return `<p>${children}</p>`
  }

  if (node.type === 'heading') {
    const tag = node.tag || 'h2'
    const children = node.children?.map(serializeNode).join('') || ''
    return `<${tag}>${children}</${tag}>`
  }

  if (node.type === 'list') {
    const tag = node.listType === 'bullet' ? 'ul' : 'ol'
    const children = node.children?.map(serializeNode).join('') || ''
    return `<${tag}>${children}</${tag}>`
  }

  if (node.type === 'listitem') {
    const children = node.children?.map(serializeNode).join('') || ''
    return `<li>${children}</li>`
  }

  if (node.type === 'link') {
    const children = node.children?.map(serializeNode).join('') || ''
    return `<a href="${node.url || '#'}">${children}</a>`
  }

  if (node.type === 'quote' || node.type === 'blockquote') {
    const children = node.children?.map(serializeNode).join('') || ''
    return `<blockquote>${children}</blockquote>`
  }

  if (node.type === 'text') {
    let text = node.text || ''
    const fmt = node.format ?? 0
    if (fmt & 1) text = `<strong>${text}</strong>`
    if (fmt & 2) text = `<em>${text}</em>`
    if (fmt & 4) text = `<span style="text-decoration:underline">${text}</span>`
    if (fmt & 8) text = `<s>${text}</s>`
    if (fmt & 16) text = `<code>${text}</code>`
    return text
  }

  if (node.type === 'linebreak') {
    return '<br />'
  }

  if (node.children) {
    return node.children.map(serializeNode).join('') || ''
  }

  return ''
}
