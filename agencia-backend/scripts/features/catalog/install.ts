import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { MONOREPO_ROOT } from '../../add-feature'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const TEMPLATE_ROOT =
  process.env.CATALOG_TEMPLATE_PATH ?? join(MONOREPO_ROOT, 'nextjs-starter')

const COMPONENTS = [
  'src/components/blocks/ProductGrid.tsx',
  'src/components/blocks/FeaturedProduct.tsx',
  'src/components/blocks/CategoryList.tsx',
]

const ROUTES = [
  'src/app/shop/page.tsx',
  'src/app/shop/category/[slug]/page.tsx',
  'src/app/product/[slug]/page.tsx',
]

const SHARED_FILES = ['src/lib/tenant.ts']

const ENV_KEY = 'NEXT_PUBLIC_TENANT_FEATURES'

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
  const allFiles = [...COMPONENTS, ...ROUTES, ...SHARED_FILES]

  // 2. Copy each file
  for (const rel of allFiles) {
    const src = resolveSrc(rel)
    const dest = join(ctx.destDir, rel)
    try {
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(src, dest)
      copiedFiles.push(rel)
      ctx.log(`✓ Copied ${rel}`)
    } catch (err) {
      // Cleanup any files we already copied
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

  // 3. Append env var
  const envPath = join(ctx.destDir, '.env.example')
  try {
    let existing = ''
    try {
      existing = await readFile(envPath, 'utf-8')
    } catch {
      // file missing — will create
    }
    if (!existing.includes(`${ENV_KEY}=`)) {
      const defaultValue = JSON.stringify({ catalog: true })
      await writeFile(
        envPath,
        existing ? `${existing}${ENV_KEY}=${defaultValue}\n` : `${ENV_KEY}=${defaultValue}\n`,
        'utf-8',
      )
      ctx.log(`✓ Appended ${ENV_KEY}= to .env.example`)
    }
  } catch (err) {
    // Rollback
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
      error: `Failed to append env var: ${(err as Error).message}`,
    }
  }

  return {
    ok: true,
    copiedFiles,
    envKeysAdded: [ENV_KEY],
  }
}
