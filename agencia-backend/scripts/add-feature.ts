import path from 'node:path'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ECOMMERCE_TIERS, isValidEcommerceTier, isValidFeatureName } from './lib/feature-keys'
import { getFeature, listFeatureSlugs } from './features'
import * as p from '@clack/prompts'
import { cp } from 'node:fs/promises'

// --- Constants ---
export const MONOREPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, '../../')
export const FEATURES_DIR = path.join(MONOREPO_ROOT, 'agencia-backend/scripts/features')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

// --- Pure: arg parsing ---
export type ParsedArgs = {
  feature?: string
  slug?: string
  status: boolean
  remove: boolean
  filter?: string
}

export const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = { status: false, remove: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--status') args.status = true
    else if (arg === '--remove') args.remove = true
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length)
    else if (arg.startsWith('--filter=')) args.filter = arg.slice('--filter='.length)
    else if (!arg.startsWith('--') && !args.feature) args.feature = arg
  }
  return args
}

// --- DB helpers ---
export const getTenantBySlug = async (
  slug: string,
): Promise<{ id: number; slug: string; features: Record<string, boolean>; ecommerceTier: string } | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (result.totalDocs === 0) return null
  const doc = result.docs[0] as {
    id: number
    slug: string
    features: Record<string, boolean>
    ecommerceTier: string
  }
  return doc
}

export const setTenantFeature = async (
  tenantId: number,
  feature: string,
  value: boolean,
): Promise<void> => {
  const payload = await getPayload({ config })
  const result = await payload.findByID({ collection: 'tenants', id: tenantId })
  const features = { ...(result.features as Record<string, boolean>) }
  features[feature] = value
  await payload.update({
    collection: 'tenants',
    id: tenantId,
    data: { features },
  })
}

export const getEnabledFeatures = (features: Record<string, boolean>): string[] =>
  Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => k)

// --- Validation ---
export const validateFeatureName = (feature: unknown): string | null => {
  if (!isValidFeatureName(feature)) {
    return `Feature "${String(feature)}" no existe. Features válidas: ${listFeatureSlugs().join(', ')}`
  }
  return null
}

export const validateTenantSlug = (slug: unknown): string | null => {
  if (typeof slug !== 'string' || slug.length === 0) {
    return 'Falta --slug=<cliente>'
  }
  return null
}

// --- Handlers ---
export const handleStatus = async (slug: string): Promise<void> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    p.log.error(`Tenant "${slug}" no existe`)
    return
  }
  console.log(`\n--- Tenant: ${tenant.slug} ---`)
  console.log(`ecommerceTier: ${tenant.ecommerceTier}`)
  const enabled = getEnabledFeatures(tenant.features)
  console.log(`features prendidas: ${enabled.length === 0 ? '(ninguna)' : enabled.join(', ')}`)
  console.log(`features apagadas:  ${listFeatureSlugs().filter((k) => !tenant.features[k]).join(', ') || '(ninguna)'}`)
  console.log('---------------------------\n')
}

export const handleEnableFeature = async (
  slug: string,
  feature: string,
): Promise<void> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    p.log.error(`Tenant "${slug}" no existe`)
    throw new Error(`Tenant "${slug}" no existe`)
  }

  if (!isValidFeatureName(feature)) {
    throw new Error(
      `Feature "${feature}" no existe. Features válidas: ${listFeatureSlugs().join(', ')}`,
    )
  }

  const mod = getFeature(feature)!
  if (tenant.features[feature]) {
    p.log.warn(`Feature "${feature}" ya estaba prendida en "${slug}". No-op.`)
    return
  }

  // Snapshot for rollback
  const originalValue = tenant.features[feature]

  // 1. Patchear el flag
  try {
    await setTenantFeature(tenant.id, feature, true)
    p.log.success(`Tenant "${slug}": features.${feature} = true`)
  } catch (err) {
    p.log.error(`No se pudo patchear el tenant: ${(err as Error).message}`)
    throw err
  }

  // 2. Llamar al install de la feature
  const destDir = path.join(CLIENTS_DIR, slug)
  try {
    const result = await mod.install({
      tenantSlug: slug,
      destDir,
      log: (msg) => p.log.info(msg),
    })
    if (!result.ok) {
      // Rollback del flag
      await setTenantFeature(tenant.id, feature, originalValue)
      throw new Error(`Install de "${feature}" falló. Rollback del flag hecho.`)
    }
    p.log.success(
      `Feature "${feature}" prendida. ${result.copiedFiles.length} archivos copiados, ${result.envKeysAdded.length} env vars agregadas.`,
    )
  } catch (err) {
    await setTenantFeature(tenant.id, feature, originalValue)
    p.log.error(`Install de "${feature}" tiró excepción. Rollback del flag hecho.`)
    throw err
  }
}

export const handleDisableFeature = async (
  slug: string,
  feature: string,
): Promise<void> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    p.log.error(`Tenant "${slug}" no existe`)
    throw new Error(`Tenant "${slug}" no existe`)
  }

  if (!isValidFeatureName(feature)) {
    throw new Error(
      `Feature "${feature}" no existe. Features válidas: ${listFeatureSlugs().join(', ')}`,
    )
  }

  if (!tenant.features[feature]) {
    p.log.warn(`Feature "${feature}" ya estaba apagada en "${slug}". No-op.`)
    return
  }

  const mod = getFeature(feature)!
  const originalValue = tenant.features[feature]

  // 1. Llamar al uninstall primero (puede borrar archivos)
  const destDir = path.join(CLIENTS_DIR, slug)
  try {
    const result = await mod.uninstall({
      tenantSlug: slug,
      destDir,
      log: (msg) => p.log.info(msg),
    })
    if (!result.ok) {
      throw new Error(`Uninstall de "${feature}" falló. Flag NO modificado.`)
    }
  } catch (err) {
    p.log.error(`Uninstall de "${feature}" tiró excepción. Flag NO modificado.`)
    throw err
  }

  // 2. Patchear el flag
  try {
    await setTenantFeature(tenant.id, feature, false)
    p.log.success(`Tenant "${slug}": features.${feature} = false`)
    p.log.success(`Feature "${feature}" apagada.`)
  } catch (err) {
    await setTenantFeature(tenant.id, feature, originalValue)
    p.log.error(`No se pudo patchear el flag. Rollback hecho.`)
    throw err
  }
}

// --- Orchestrator ---
export const run = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const args = parseArgs(argv)

  // --status solo necesita --slug
  if (args.status) {
    if (args.filter) {
      // Bulk status: filtrar tenants por algún criterio
      p.log.warn(`--filter con --status no implementado todavía (Sprint futuro).`)
      return
    }
    const slugError = validateTenantSlug(args.slug)
    if (slugError) {
      p.log.error(slugError)
      process.exit(1)
    }
    await handleStatus(args.slug!)
    return
  }

  // Enable/disable necesitan feature + slug
  const featureError = validateFeatureName(args.feature)
  if (featureError) {
    p.log.error(featureError)
    process.exit(1)
  }
  const slugError = validateTenantSlug(args.slug)
  if (slugError) {
    p.log.error(slugError)
    process.exit(1)
  }

  if (args.remove) {
    await handleDisableFeature(args.slug!, args.feature!)
  } else {
    await handleEnableFeature(args.slug!, args.feature!)
  }
}

// Auto-invoke solo cuando se ejecuta como script principal
// (no cuando se importa desde tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2)
  run(argv).catch((err) => {
    p.log.error((err as Error).message)
    process.exit(1)
  })
}
