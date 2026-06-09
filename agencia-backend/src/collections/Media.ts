import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Multi-Tenant',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt Text',
    },
  ],
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 1024, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const forbiddenExtensions = ['.exe', '.bat', '.sh', '.php', '.js']
        const filename = data.filename as string | undefined
        if (filename && forbiddenExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
          throw new Error('Tipo de archivo no permitido')
        }
        return data
      },
    ],
  },
}
