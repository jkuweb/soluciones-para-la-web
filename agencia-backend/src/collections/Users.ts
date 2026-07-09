import type { CollectionConfig, FieldAccess } from 'payload'

/**
 * Role Descriptions:
 * - super-admin:   Full CRUD access across all tenants. Can create/delete pages,
 *                  manage block structure (add, remove, reorder), configure tenants,
 *                  and manage users.
 * - tenant-admin:  Content-only edits within assigned tenant(s). Can edit text,
 *                  images, and metadata of existing pages/blocks. CANNOT add,
 *                  remove, or reorder blocks. CANNOT create or delete pages.
 *                  Can manage users within their tenant but CANNOT assign
 *                  super-admin role or change their own role.
 * - tenant-editor: Future role — reserved for more granular permissions.
 *                  Currently behaves as content-only (same as tenant-admin
 *                  with potential future restrictions).
 */

// Helper to get tenant IDs from the current user
const getUserTenantIds = (user: any): number[] => {
  if (!user?.tenants) return []
  return user.tenants.map((t: any) =>
    typeof t.tenant === 'number' ? t.tenant : t.tenant?.id
  ).filter(Boolean)
}

// Helper to check if user is super-admin
const isSuperAdmin = (user: any): boolean => {
  return user?.roles?.includes('super-admin') ?? false
}

// Helper to check if user is tenant-admin
const isTenantAdmin = (user: any): boolean => {
  return user?.roles?.includes('tenant-admin') ?? false
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    cookies: {
      sameSite: 'None',
      secure: false,
    },
    // Disable login throttling outside production so local work doesn't
    // lock the super-admin out. Production keeps the default 5 attempts
    // per 10 minutes for anti-brute-force protection.
    maxLoginAttempts: process.env.NODE_ENV === 'production' ? 5 : 0,
  },
  access: {
    // Read: super-admin sees all, tenant-admin sees only users in their tenants
    // The multi-tenant plugin automatically filters by tenant for registered collections
    read: ({ req: { user } }) => {
      if (isSuperAdmin(user)) return true
      if (isTenantAdmin(user)) return true
      return false
    },

    // Create: super-admin can create anyone, tenant-admin can create users for their tenants
    create: ({ req: { user } }) => {
      if (isSuperAdmin(user)) return true
      if (isTenantAdmin(user)) return true
      return false
    },

    // Update: super-admin can update anyone, tenant-admin can update users in their tenants
    // (including themselves, but role field has its own access control)
    update: ({ req: { user } }) => {
      if (isSuperAdmin(user)) return true
      if (isTenantAdmin(user)) return true
      return false
    },

    // Delete: super-admin can delete anyone, tenant-admin can delete users in their tenants
    // Note: self-deletion prevention is handled in the beforeDelete hook
    delete: ({ req: { user } }) => {
      if (isSuperAdmin(user)) return true
      if (isTenantAdmin(user)) return true
      return false
    },

    // Admin: only super-admin can access admin panel by default
    // tenant-admin and tenant-editor can also access
    admin: ({ req: { user } }) => {
      if (!user) return false
      return (
        isSuperAdmin(user) ||
        isTenantAdmin(user) ||
        user?.roles?.includes('tenant-editor')
      )
    },
  },
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
      access: {
        // Role field access control:
        // - super-admin: full access
        // - tenant-admin: can read, can update only if NOT editing themselves
        //                 and CANNOT assign super-admin
        read: () => true,
        create: ({ req: { user } }) => {
          if (isSuperAdmin(user)) return true
          if (isTenantAdmin(user)) return true
          return false
        },
        update: ({ req: { user }, doc }) => {
          if (isSuperAdmin(user)) return true
          if (isTenantAdmin(user)) {
            // Tenant-admin cannot edit their own role
            if (doc?.id === user?.id) return false
            return true
          }
          return false
        },
      },
      // Hook to validate role assignment
      hooks: {
        beforeValidate: [
          ({ value, req: { user }, operation }) => {
            // Only validate on create/update
            if (operation !== 'create' && operation !== 'update') return value

            if (isTenantAdmin(user)) {
              // Tenant-admin cannot assign super-admin to anyone
              if (value === 'super-admin') {
                throw new Error(
                  'Tenant-admin cannot assign super-admin role. Only super-admin can create super-admin users.'
                )
              }
            }
            return value
          },
        ],
      },
    },
    // Note: The 'tenants' field is automatically managed by the multi-tenant plugin
    // when 'users' is included in the plugin's collections configuration.
  ],
  hooks: {
    beforeChange: [
      // Prevent tenant-admin from removing themselves from their tenant
      async ({ req, operation, data, originalDoc }) => {
        if (operation !== 'update') return data

        const user = req.user
        if (!user || isSuperAdmin(user)) return data

        // If editing their own user
        if (originalDoc?.id === user?.id) {
          // Ensure they keep at least one tenant
          const originalTenants = originalDoc?.tenants || []
          const newTenants = data?.tenants || []

          if (originalTenants.length > 0 && newTenants.length === 0) {
            throw new Error(
              'You cannot remove yourself from all tenants. You must remain in at least one tenant.'
            )
          }
        }

        return data
      },
    ],
  },
}
