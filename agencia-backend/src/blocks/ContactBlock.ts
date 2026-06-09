import type { Block } from 'payload'

export const ContactBlock: Block = {
  slug: 'contact',
  fields: [
    {
      name: 'email',
      type: 'email',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'address',
      type: 'textarea',
    },
    {
      name: 'mapUrl',
      type: 'text',
    },
  ],
  labels: {
    singular: 'Contact',
    plural: 'Contact Blocks',
  },
}
