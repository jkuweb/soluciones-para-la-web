/**
 * Dev utility: force a tenant into "payments active" state for local testing.
 *
 * Bypasses the Stripe Connect onboarding flow so you can see orders in the
 * Payload admin and run the checkout e2e without setting up KYC. Use only
 * against dev tenants — never in production.
 *
 * What it does:
 *   - Sets features.payments = true
 *   - Sets features.stripeAccountStatus = 'active'
 *   - Sets features.stripeAccountId to a stable placeholder (only if missing)
 *
 * Idempotent: running it twice produces the same result.
 *
 * Usage:
 *   pnpm dev:force-payments-active --slug=<tenant>
 *   pnpm dev:force-payments-active --slug=mood
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import * as p from '@clack/prompts'

const parseSlug = (argv: string[]): string | null => {
  for (const arg of argv) {
    if (arg.startsWith('--slug=')) return arg.slice('--slug='.length)
  }
  return null
}

const PLACEHOLDER_PREFIX = 'acct_dev_'

const buildPlaceholderAccountId = (slug: string): string =>
  `${PLACEHOLDER_PREFIX}${slug.replace(/[^a-z0-9]/g, '_')}`

export const run = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const slug = parseSlug(argv)
  if (!slug) {
    p.log.error('Falta --slug=<tenant>')
    p.log.info('Uso: pnpm dev:force-payments-active --slug=<tenant>')
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (result.totalDocs === 0) {
    p.log.error(`Tenant "${slug}" no existe. Crealo primero con: pnpm create-client`)
    process.exit(1)
  }
  const tenant = result.docs[0]! as {
    id: number | string
    features?: Record<string, unknown>
  }

  const currentFeatures = tenant.features ?? {}
  const stripeAccountId =
    (typeof currentFeatures.stripeAccountId === 'string' &&
      currentFeatures.stripeAccountId) ||
    buildPlaceholderAccountId(slug)

  const newFeatures: Record<string, unknown> = {
    ...currentFeatures,
    payments: true,
    stripeAccountStatus: 'active',
    stripeAccountId,
  }

  await payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: { features: newFeatures },
    overrideAccess: true,
  })

  p.log.success(`Tenant "${slug}" (id ${tenant.id}) forzado a payments active:`)
  p.log.info('  features.payments = true')
  p.log.info("  features.stripeAccountStatus = 'active'")
  p.log.info(`  features.stripeAccountId = ${stripeAccountId}`)
  p.log.warn(
    'Dev only: si necesitás conectar un Stripe account real, corré el flujo OAuth desde /admin/pagos (el webhook account.updated lo va a sobrescribir).',
  )

  // Payload keeps connections open; explicit exit avoids the wrapper hanging.
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    p.log.error((err as Error).message)
    process.exit(1)
  })
}
