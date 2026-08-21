import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const TEMPLATE_PATH = join(
  process.cwd(),
  '..',
  'nextjs-starter',
  'src',
  'components',
  'blocks',
  'WelcomeBanner.tsx',
)

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'

export const install = async (
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  const dest = join(ctx.destDir, COMPONENT_RELATIVE)
  await mkdir(dirname(dest), { recursive: true })
  await copyFile(TEMPLATE_PATH, dest)
  ctx.log(`✓ Copied ${COMPONENT_RELATIVE}`)
  return {
    ok: true,
    copiedFiles: [COMPONENT_RELATIVE],
    envKeysAdded: [],
  }
}
