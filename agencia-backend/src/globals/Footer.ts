import type { GlobalConfig } from 'payload'
import { link } from '@/fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      label: 'Navigation Items',
      admin: {
        initCollapsed: true,
      },
      fields: [
        link({
          disableLabel: false,
        }),
      ],
    },
    {
      name: 'copyright',
      type: 'text',
      label: 'Copyright Text',
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Social Links',
      admin: {
        initCollapsed: true,
      },
      fields: [
        link({
          disableLabel: true,
        }),
      ],
    },
  ],
}
