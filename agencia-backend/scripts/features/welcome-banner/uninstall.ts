import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'

export const uninstall = async (ctx: FeatureInstallContext): Promise<FeatureInstallResult> => {
  const target = join(ctx.destDir, COMPONENT_RELATIVE)
  try {
    await rm(target)
    ctx.log(`✓ Removed ${COMPONENT_RELATIVE}`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      return {
        ok: false,
        copiedFiles: [],
        envKeysAdded: [],
        error: `Failed to remove component: ${(err as Error).message}`,
      }
    }
    ctx.log(`(skipped) ${COMPONENT_RELATIVE} not present`)
  }
  // Remove WELCOME_BANNER_TEXT from .env.example (no-op if missing)
  const envPath = join(ctx.destDir, '.env.example')
  try {
    const content = await readFile(envPath, 'utf-8')
    const lines = content.split('\n')
    const filtered = lines.filter((line) => !line.startsWith('WELCOME_BANNER_TEXT='))
    await writeFile(envPath, filtered.join('\n'), 'utf-8')
    if (lines.length !== filtered.length) {
      ctx.log(`✓ Removed WELCOME_BANNER_TEXT from .env.example`)
    }
  } catch {
    // .env.example missing — no-op
  }

  return {
    ok: true,
    copiedFiles: [],
    envKeysAdded: [],
  }
}
