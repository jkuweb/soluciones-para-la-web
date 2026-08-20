/**
 * Reset the super-admin user's password.
 *
 * Use case: when the developer forgot the original password or the DB
 * was seeded elsewhere. Generates a strong random password, prints it
 * once, and the developer changes it from the admin panel right after.
 *
 * Usage:
 *   pnpm reset:super-admin-password
 *
 * WARNING: prints the new password to stdout. Run it in a terminal you
 * can copy from, not in a shared screen / CI log.
 */
import crypto from 'node:crypto'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function run(): Promise<void> {
  const payload = await getPayload({ config })

  const superAdmin = await payload.find({
    collection: 'users',
    where: { roles: { equals: 'super-admin' } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  const target = superAdmin.docs[0]
  if (!target) {
    console.error('No super-admin user found in the database.')
    process.exit(1)
  }

  const newPassword = crypto.randomBytes(18).toString('base64url')

  await payload.update({
    collection: 'users',
    id: target.id,
    data: { password: newPassword },
    overrideAccess: true,
  })

  console.log(JSON.stringify(
    {
      ok: true,
      id: target.id,
      email: target.email,
      roles: target.roles,
      newPassword,
      nextStep: 'Log in at /admin, then change the password from your profile.',
    },
    null,
    2,
  ))

  // Payload keeps the DB pool open; one-shot script needs explicit exit.
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
