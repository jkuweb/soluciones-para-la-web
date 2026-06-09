import type { StaticImageData } from 'next/image'

import React from 'react'

import type { MediaBlock as MediaBlockProps } from '@/payload-types'

import { Media } from '@/components/Media/Media'
import RichText from '@/components/RichText/RichText'

type Props = MediaBlockProps & {
  breakout?: boolean
  captionClassName?: string
  className?: string
  enableGutter?: boolean
  imgClassName?: string
  disableInnerContainer?: boolean
}

export const MediaBlock: React.FC<Props> = (props) => {
  const {
    captionClassName,
    className,
    enableGutter = true,
    imgClassName,
    media,
    disableInnerContainer,
  } = props

  let caption
  if (media && typeof media === 'object') caption = (media as any).caption

  return (
    <div className={className}>
      {media && <Media resource={media} />}
      {caption && (
        <div>
          <RichText data={caption} enableGutter={false} />
        </div>
      )}
    </div>
  )
}
