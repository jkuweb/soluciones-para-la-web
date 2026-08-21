import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { MONOREPO_ROOT } from '../../add-feature'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'
const ENV_EXAMPLE = '.env.example'
const ENV_KEY = 'WELCOME_BANNER_TEXT'

const resolveTemplatePath = (): string =>
  process.env.WELCOME_BANNER_TEMPLATE_PATH ??
  join(MONOREPO_ROOT, 'nextjs-starter', 'src', 'components', 'blocks', 'WelcomeBanner.tsx')

export const install = async (ctx: FeatureInstallContext): Promise<FeatureInstallResult> => {
  // Validate destDir exists
  try {
    const destStat = await stat(ctx.destDir)
    if (!destStat.isDirectory()) {
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

  const dest = join(ctx.destDir, COMPONENT_RELATIVE)
  await mkdir(dirname(dest), { recursive: true })
  try {
    await copyFile(resolveTemplatePath(), dest)
    ctx.log(`✓ Copied ${COMPONENT_RELATIVE}`)
  } catch (err) {
    return {
      ok: false,
      error: `Failed to copy template: ${(err as Error).message}`,
      copiedFiles: [],
      envKeysAdded: [],
    }
  }

  // Append env var to .env.example (create if missing)
  const envPath = join(ctx.destDir, ENV_EXAMPLE)
  try {
    let existing = ''
    try {
      existing = await readFile(envPath, 'utf-8')
    } catch {
      // file does not exist — will create
    }
    if (!existing.includes(`${ENV_KEY}=`)) {
      try {
        await writeFile(envPath, existing ? `${existing}${ENV_KEY}=\n` : `${ENV_KEY}=\n`, 'utf-8')
        ctx.log(`✓ Appended ${ENV_KEY}= to ${ENV_EXAMPLE}`)
      } catch (err) {
        // Cleanup: remove the copied component file before returning
        try {
          await rm(dest)
          ctx.log(`(cleanup) Removed ${COMPONENT_RELATIVE} after env append failure`)
        } catch {
          // Best-effort cleanup
        }
        return {
          ok: false,
          copiedFiles: [],
          envKeysAdded: [],
          error: `Failed to append env var: ${(err as Error).message}`,
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      copiedFiles: [],
      envKeysAdded: [],
      error: `Env handling failed: ${(err as Error).message}`,
    }
  }

  return {
    ok: true,
    copiedFiles: [COMPONENT_RELATIVE],
    envKeysAdded: [ENV_KEY],
  }
}
