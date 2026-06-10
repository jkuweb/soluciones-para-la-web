'use client'

import { Image as UnpicImage } from '@unpic/react'

export interface CloudinaryImageProps {
  src: string
  alt: string
  priority?: boolean
  fill?: boolean
  width?: number
  height?: number
  className?: string
}

export const Image = ({
  src,
  alt,
  priority = false,
  fill = false,
  width,
  height,
  className,
}: CloudinaryImageProps) => {
  if (fill) {
    return (
      <UnpicImage
        src={src}
        alt={alt}
        layout="fullWidth"
        priority={priority}
        className={className}
      />
    )
  }

  return (
    <UnpicImage
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 600}
      layout="constrained"
      priority={priority}
      className={className}
    />
  )
}
