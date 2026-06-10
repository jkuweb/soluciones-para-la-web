'use client'
import type { TextBlock } from '@/lib/types'
import { serializeLexical } from '@/lib/lexical'

interface TextBlockProps {
  data: TextBlock
}

export default function TextBlock({ data }: TextBlockProps) {
  const html = data.content ? serializeLexical(data.content) : ''

  return (
    <section className="text-block">
      {data.heading && <h2>{data.heading}</h2>}
      {html && <div className="content" dangerouslySetInnerHTML={{ __html: html }} />}
      <style jsx>{`
        .text-block {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .text-block h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        .content {
          line-height: 1.6;
        }
      `}</style>
    </section>
  )
}
