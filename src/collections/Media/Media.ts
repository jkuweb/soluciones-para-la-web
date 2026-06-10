import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt text',
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
    },
  ],
  upload: true,
}
