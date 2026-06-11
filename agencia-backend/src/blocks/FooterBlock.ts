import { Block } from 'payload'
import { linkGroup } from '@/fields/linkGroup'

export const FooterBlock: Block = {
  slug: 'footer',
  fields: [
    {
      name: 'copyright',
      type: 'text',
    },
    linkGroup({
      overrides: {
        name: 'socialLinks',
        label: 'Social Links',
      },
    }),
  ],
}
