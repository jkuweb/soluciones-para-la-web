import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'Multi-Tenant',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['editor'],
      options: [
        {
          label: 'Super Admin',
          value: 'super-admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
      label: 'Roles',
    },
  ],
}
