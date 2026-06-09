import type { Block } from 'payload'

export const ImageBlock: Block = {
  slug: 'image',
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
  labels: {
    singular: 'Image',
    plural: 'Image Blocks',
  },
}
