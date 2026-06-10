'use client'
import type { ImageBlock } from '@/lib/types'

interface ImageBlockProps {
  data: ImageBlock
}

export default function ImageBlock({ data }: ImageBlockProps) {
  return (
    <figure className="image-block">
      <img src={data.image} alt={data.caption || ''} loading="lazy" />
      {data.caption && <figcaption>{data.caption}</figcaption>}
      <style jsx>{`
        .image-block {
          margin: 2rem auto;
          max-width: 1000px;
          text-align: center;
        }
        .image-block img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        figcaption {
          margin-top: 0.5rem;
          font-style: italic;
          color: #666;
        }
      `}</style>
    </figure>
  )
}
