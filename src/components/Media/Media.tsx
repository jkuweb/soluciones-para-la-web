'use client'

import { useEffect, useState } from 'react'
import { Image } from '@/components/Image'
import type { Media as MediaType } from '@/payload-types'

export const Media = ({
  resource,
  fill,
  priority,
  className,
}: {
  resource: number | MediaType | null
  fill?: boolean
  priority?: boolean
  className?: string
}) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!resource) return

    const media = typeof resource === 'number' ? null : resource
    if (!media?.url) return

    const isVideo = 
      media?.mimeType?.startsWith('video/') ||
      media?.filename?.toLowerCase()?.match(/\.(mp4|webm|mov|avi|mkv|wmv)$/)

    let urlToUse = media.url

    if (urlToUse.startsWith('/api/media/file/')) {
      fetch(urlToUse, { method: 'HEAD', redirect: 'manual' })
        .then(res => {
          let resolvedUrl = res.headers.get('location') || urlToUse
          if (isVideo && resolvedUrl.includes('/image/upload/')) {
            resolvedUrl = resolvedUrl.replace('/image/upload/', '/video/upload/')
          }
          setUrl(resolvedUrl)
        })
        .catch(() => {
          if (isVideo && urlToUse.includes('/image/upload/')) {
            urlToUse = urlToUse.replace('/image/upload/', '/video/upload/')
          }
          setUrl(urlToUse)
        })
    } else {
      if (isVideo && urlToUse.includes('/image/upload/')) {
        urlToUse = urlToUse.replace('/image/upload/', '/video/upload/')
      }
      setUrl(urlToUse)
    }
  }, [resource])

  if (!url) return null

  const media = typeof resource === 'number' ? null : resource

  const isVideo = 
    url.includes('/video/upload') ||
    media?.mimeType?.startsWith('video/') ||
    media?.filename?.toLowerCase()?.match(/\.(mp4|webm|mov|avi|mkv|wmv)$/)

  if (isVideo) {
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        className={className}
        style={{ width: '100%', maxWidth: '100%' }}
      >
        <source src={url} />
      </video>
    )
  }

  const isSvg = media?.filename?.toLowerCase()?.endsWith('.svg')

  if (isSvg) {
    return <InlineSvg src={url} className={className} />
  }

  return (
    <Image
      src={url}
      alt={media?.alt || ''}
      fill={fill}
      priority={priority}
      width={media?.width || undefined}
      height={media?.height || undefined}
    />
  )
}

function InlineSvg({ src, className }: { src: string; className?: string }) {
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then((content) => {
        setSvgContent(content)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [src])

  if (loading) return null

  return <div className={className} dangerouslySetInnerHTML={{ __html: svgContent }} />
}