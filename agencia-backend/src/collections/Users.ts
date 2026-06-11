import type { CollectionConfig } from 'payload'

/**
 * Role Descriptions:
 * - super-admin:   Full CRUD access across all tenants. Can create/delete pages,
 *                  manage block structure (add, remove, reorder), configure tenants,
 *                  and manage users.
 * - tenant-admin:  Content-only edits within assigned tenant(s). Can edit text,
 *                  images, and metadata of existing pages/blocks. CANNOT add,
 *                  remove, or reorder blocks. CANNOT create or delete pages.
 * - tenant-editor: Future role — reserved for more granular permissions.
 *                  Currently behaves as content-only (same as tenant-admin
 *                  with potential future restrictions).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      options: [
        { label: 'Super Admin', value: 'super-admin' },
        { label: 'Tenant Admin', value: 'tenant-admin' },
        { label: 'Tenant Editor', value: 'tenant-editor' },
      ],
      defaultValue: 'tenant-editor',
      required: true,
    },
  ],
}
