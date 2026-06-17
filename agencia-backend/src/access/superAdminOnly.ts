import type { FieldAccess } from 'payload'

/**
 * Field-level access: only super-admin can read, create, or update.
 *
 * Use this for fields that control structural aspects of a document
 * (e.g. block configuration toggles) that clients should not be able to
 * read, modify via the admin UI, or hit via the API.
 *
 * NOTE: applying this to `read` filters the value out of the response,
 * which may break sibling `admin.condition` checks. If a dependent field
 * needs to read this value at render time, use `() => true` for `read`
 * and reserve `superAdminOnly` for `create`/`update`.
 *
 * @example
 * ```ts
 * {
 *   name: 'enableCta',
 *   type: 'checkbox',
 *   access: {
 *     read: () => true,           // value must flow to siblingData for conditions
 *     create: superAdminOnly,
 *     update: superAdminOnly,
 *   },
 * }
 * ```
 */
export const superAdminOnly: FieldAccess = ({ req: { user } }) => {
  return user?.roles?.includes('super-admin') ?? false
}
