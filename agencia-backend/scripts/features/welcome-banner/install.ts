import { appendFile, copyFile, mkdir, writeFile } from 'node:fs/promises'
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
const ENV_EXAMPLE = '.env.example'
const ENV_KEY = 'WELCOME_BANNER_TEXT'

export const install = async (
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  const dest = join(ctx.destDir, COMPONENT_RELATIVE)
  await mkdir(dirname(dest), { recursive: true })
  await copyFile(TEMPLATE_PATH, dest)
  ctx.log(`✓ Copied ${COMPONENT_RELATIVE}`)

  // Append env var to .env.example (create if missing)
  const envPath = join(ctx.destDir, ENV_EXAMPLE)
  let existing = ''
  try {
    existing = await (await import('node:fs/promises')).readFile(envPath, 'utf-8')
  } catch {
    // file does not exist — will create
  }
  if (!existing.includes(`${ENV_KEY}=`)) {
    await writeFile(envPath, existing ? `${existing}${ENV_KEY}=\n` : `${ENV_KEY}=\n`, 'utf-8')
    ctx.log(`✓ Appended ${ENV_KEY}= to ${ENV_EXAMPLE}`)
  }

  return {
    ok: true,
    copiedFiles: [COMPONENT_RELATIVE],
    envKeysAdded: [ENV_KEY],
  }
}
