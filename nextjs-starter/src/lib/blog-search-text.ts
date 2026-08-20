import type { LexicalNode, Post } from './types'

/**
 * Walk a Lexical tree and return the concatenated plain text.
 * Handles the Payload wrapper `{ root: LexicalNode }` shape and arbitrary
 * nesting of children. Whitespace is preserved per node (joined with spaces).
 */
export function flattenLexical(
  node: LexicalNode | { root: LexicalNode } | undefined,
): string {
  if (!node) return ''
  const root = 'root' in node ? node.root : node
  if (!root) return ''
  let text = ''
  if (root.text) text += root.text + ' '
  if (Array.isArray(root.children)) {
    text += root.children.map((c) => flattenLexical(c)).join(' ')
  }
  return text
}

/**
 * Build the search corpus for a post.
 * Prefers the editorial excerpt; otherwise flattens the Lexical content and
 * truncates to 160 chars to keep the search index small.
 */
export function postSearchText(post: Post): string {
  if (post.excerpt && post.excerpt.trim()) return post.excerpt
  const flat = flattenLexical(post.content).replace(/\s+/g, ' ').trim()
  if (flat) return flat.slice(0, 160)
  return ''
}
