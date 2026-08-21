import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'

export const uninstall = async (
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
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
  return {
    ok: true,
    copiedFiles: [],
    envKeysAdded: [],
  }
}
