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
