import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const FILES = [
  'src/store/cart.ts',
  'src/components/cart/CartProvider.tsx',
  'src/components/cart/AddToCartButton.tsx',
  'src/components/cart/CartBadge.tsx',
  'src/components/cart/styles.module.css',
  'src/components/blocks/CartSummaryBlock.tsx',
  'src/lib/stripe.ts',
  'src/app/cart/page.tsx',
  'src/app/checkout/page.tsx',
  'src/app/checkout/success/page.tsx',
  'src/app/checkout/cancel/page.tsx',
  'src/app/admin/pagos/page.tsx',
  'src/app/api/checkout/session/route.ts',
  'src/app/api/stripe/connect/route.ts',
  'src/app/api/stripe/connect/callback/route.ts',
]

const ENV_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_CLIENT_ID', 'STRIPE_OAUTH_STATE_SECRET']

export const uninstall = async (ctx: FeatureInstallContext): Promise<FeatureInstallResult> => {
  // 1. Remove each file (whitelist — never touches anything else)
  for (const rel of FILES) {
    const target = join(ctx.destDir, rel)
    try {
      await rm(target)
      ctx.log(`✓ Removed ${rel}`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        return {
          ok: false,
          copiedFiles: [],
          envKeysAdded: [],
          error: `Failed to remove ${rel}: ${(err as Error).message}`,
        }
      }
      ctx.log(`(skipped) ${rel} not present`)
    }
  }

  // 2. Remove Stripe env vars from .env.example
  const envPath = join(ctx.destDir, '.env.example')
  try {
    const content = await readFile(envPath, 'utf-8')
    const lines = content.split('\n')
    const filtered = lines.filter(
      (line) => !ENV_KEYS.some((key) => line.startsWith(`${key}=`)),
    )
    if (filtered.length !== lines.length) {
      await writeFile(envPath, filtered.join('\n'), 'utf-8')
      ctx.log(`✓ Removed Stripe env vars from .env.example`)
    }
  } catch {
    // .env.example missing — no-op
  }

  return { ok: true, copiedFiles: [], envKeysAdded: [] }
}
