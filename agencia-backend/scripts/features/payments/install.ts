import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { MONOREPO_ROOT } from '../../lib/monorepo'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const TEMPLATE_ROOT =
  process.env.PAYMENTS_TEMPLATE_PATH ?? join(MONOREPO_ROOT, 'nextjs-starter')

const STORE_FILES = ['src/store/cart.ts']

const COMPONENT_FILES = [
  'src/components/cart/CartProvider.tsx',
  'src/components/cart/AddToCartButton.tsx',
  'src/components/cart/CartBadge.tsx',
  'src/components/cart/styles.module.css',
]

const BLOCK_FILES = ['src/components/blocks/CartSummaryBlock.tsx']

const LIB_FILES = ['src/lib/stripe.ts']

const PAGE_FILES = [
  'src/app/cart/page.tsx',
  'src/app/checkout/page.tsx',
  'src/app/checkout/success/page.tsx',
  'src/app/checkout/cancel/page.tsx',
  'src/app/admin/pagos/page.tsx',
]

const API_ROUTE_FILES = [
  'src/app/api/checkout/session/route.ts',
  'src/app/api/stripe/connect/route.ts',
  'src/app/api/stripe/connect/callback/route.ts',
]

const ENV_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_CLIENT_ID', 'STRIPE_OAUTH_STATE_SECRET']

const resolveSrc = (rel: string): string => join(TEMPLATE_ROOT, rel)

export const install = async (ctx: FeatureInstallContext): Promise<FeatureInstallResult> => {
  // 1. Validate destDir
  try {
    const s = await stat(ctx.destDir)
    if (!s.isDirectory()) {
      return {
        ok: false,
        copiedFiles: [],
        envKeysAdded: [],
        error: `destDir is not a directory: ${ctx.destDir}`,
      }
    }
  } catch {
    return {
      ok: false,
      copiedFiles: [],
      envKeysAdded: [],
      error: `destDir does not exist: ${ctx.destDir}`,
    }
  }

  const copiedFiles: string[] = []
  const allFiles = [
    ...STORE_FILES,
    ...COMPONENT_FILES,
    ...BLOCK_FILES,
    ...LIB_FILES,
    ...PAGE_FILES,
    ...API_ROUTE_FILES,
  ]

  // 2. Copy each file (rollback on any failure)
  for (const rel of allFiles) {
    const src = resolveSrc(rel)
    const dest = join(ctx.destDir, rel)
    try {
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(src, dest)
      copiedFiles.push(rel)
      ctx.log(`✓ Copied ${rel}`)
    } catch (err) {
      for (const already of copiedFiles) {
        try {
          await rm(join(ctx.destDir, already))
        } catch {
          /* best-effort */
        }
      }
      return {
        ok: false,
        copiedFiles: [],
        envKeysAdded: [],
        error: `Failed to copy ${rel}: ${(err as Error).message}`,
      }
    }
  }

  // 3. Append Stripe env vars (idempotent: skip if already present)
  const envPath = join(ctx.destDir, '.env.example')
  const envKeysAdded: string[] = []
  try {
    let existing = ''
    try {
      existing = await readFile(envPath, 'utf-8')
    } catch {
      // file missing — will create
    }
    let toAppend = ''
    for (const key of ENV_KEYS) {
      if (!existing.includes(`${key}=`)) {
        toAppend += `${key}=\n`
        envKeysAdded.push(key)
      }
    }
    if (toAppend) {
      await writeFile(
        envPath,
        existing ? `${existing}${toAppend}` : toAppend,
        'utf-8',
      )
      ctx.log(`✓ Appended Stripe env vars to .env.example: ${envKeysAdded.join(', ')}`)
    }
  } catch (err) {
    for (const rel of copiedFiles) {
      try {
        await rm(join(ctx.destDir, rel))
      } catch {
        /* best-effort */
      }
    }
    return {
      ok: false,
      copiedFiles: [],
      envKeysAdded: [],
      error: `Failed to append env vars: ${(err as Error).message}`,
    }
  }

  return {
    ok: true,
    copiedFiles,
    envKeysAdded,
  }
}
