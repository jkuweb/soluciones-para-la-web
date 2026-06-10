import React from 'react'
import RichText from '@/components/RichText/RichText'

type BannerBlockProps = {
  style: 'info' | 'warning' | 'error' | 'success'
  content: any
}

type Props = {
  className?: string
} & BannerBlockProps

export const BannerBlock: React.FC<Props> = ({ className, content, style }) => {
  return (
    <div className={className || ''}>
      <div className="">
        <RichText data={content} enableGutter={false} enableProse={false} />
      </div>
    </div>
  )
}
