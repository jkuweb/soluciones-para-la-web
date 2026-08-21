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

  it(
    'removes WELCOME_BANNER_TEXT line from .env.example',
    { timeout: 10000 },
    async () => {
      await writeFile(
        join(workDir, '.env.example'),
        'OTHER_VAR=foo\nWELCOME_BANNER_TEXT=hello\nOTHER_VAR2=bar\n',
        'utf-8',
      )
      await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
      const { readFile } = await import('node:fs/promises')
      const content = await readFile(join(workDir, '.env.example'), 'utf-8')
      expect(content).toContain('OTHER_VAR=foo')
      expect(content).toContain('OTHER_VAR2=bar')
      expect(content).not.toContain('WELCOME_BANNER_TEXT')
    },
  )

  it(
    'no-ops gracefully if component file missing',
    { timeout: 10000 },
    async () => {
      const emptyDir = await mkdtemp(join(tmpdir(), 'welcome-banner-empty-'))
      try {
        const result = await uninstall({ tenantSlug: 'test', destDir: emptyDir, log: () => {} })
        expect(result.ok).toBe(true)
      } finally {
        await rm(emptyDir, { recursive: true, force: true })
      }
    },
  )

  it(
    'no-ops gracefully if .env.example missing',
    { timeout: 10000 },
    async () => {
      const result = await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
      expect(result.ok).toBe(true)
    },
  )

  it(
    'no-ops gracefully if WELCOME_BANNER_TEXT not present in .env.example',
    { timeout: 10000 },
    async () => {
      await writeFile(join(workDir, '.env.example'), 'FOO=bar\n', 'utf-8')
      const result = await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
      expect(result.ok).toBe(true)
    },
  )
})
