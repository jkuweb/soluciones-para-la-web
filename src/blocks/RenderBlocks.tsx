import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { ListBlock } from './List/Component'
import { OptionsBlock } from './Options/Component'
import { CTABlock } from './CTA/Component'
import { ContentBlock } from './Content/Component'

const blockComponents = {
  mediaBlock: MediaBlock,
  optionsBlock: OptionsBlock,
  list: ListBlock,
  cta: CTABlock,
  content: ContentBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <Fragment key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </Fragment>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
