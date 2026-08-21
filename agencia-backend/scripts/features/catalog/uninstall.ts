import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const FILES = [
  'src/components/blocks/ProductGrid.tsx',
  'src/components/blocks/FeaturedProduct.tsx',
  'src/components/blocks/CategoryList.tsx',
  'src/app/shop/page.tsx',
  'src/app/shop/category/[slug]/page.tsx',
  'src/app/product/[slug]/page.tsx',
  'src/lib/tenant.ts',
]

const ENV_KEY = 'NEXT_PUBLIC_TENANT_FEATURES'

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

  // 2. Remove env var
  const envPath = join(ctx.destDir, '.env.example')
  try {
    const content = await readFile(envPath, 'utf-8')
    const lines = content.split('\n')
    const filtered = lines.filter((line) => !line.startsWith(`${ENV_KEY}=`))
    await writeFile(envPath, filtered.join('\n'), 'utf-8')
    if (lines.length !== filtered.length) {
      ctx.log(`✓ Removed ${ENV_KEY} from .env.example`)
    }
  } catch {
    // .env.example missing — no-op
  }

  return { ok: true, copiedFiles: [], envKeysAdded: [] }
}
