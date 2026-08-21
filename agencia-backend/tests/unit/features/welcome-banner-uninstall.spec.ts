import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { uninstall } from '../../../scripts/features/welcome-banner/uninstall'

let workDir: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'welcome-banner-uninstall-test-'))
  await mkdir(join(workDir, 'src', 'components', 'blocks'), { recursive: true })
  await writeFile(
    join(workDir, 'src', 'components', 'blocks', 'WelcomeBanner.tsx'),
    'placeholder',
    'utf-8',
  )
})

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true })
})

describe('welcome-banner uninstall', () => {
  it(
    'deletes the component file',
    { timeout: 10000 },
    async () => {
      const result = await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
      expect(result.ok).toBe(true)
      await expect(
        stat(join(workDir, 'src', 'components', 'blocks', 'WelcomeBanner.tsx')),
      ).rejects.toThrow()
    },
  )
})
