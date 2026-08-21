import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { install } from '../../../scripts/features/welcome-banner/install'

let workDir: string
let templateRoot: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'welcome-banner-test-'))
  templateRoot = await mkdtemp(join(tmpdir(), 'welcome-banner-template-'))
  await mkdir(join(templateRoot, 'nextjs-starter', 'src', 'components', 'blocks'), { recursive: true })
  await writeFile(
    join(templateRoot, 'nextjs-starter', 'src', 'components', 'blocks', 'WelcomeBanner.tsx'),
    'export default function WelcomeBanner() { return <div>template</div> }',
    'utf-8',
  )
})

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true })
  await rm(templateRoot, { recursive: true, force: true })
})

describe('welcome-banner install', () => {
  it(
    'copies the component file to destDir/src/components/blocks/',
    { timeout: 10000 },
    async () => {
      const result = await install({
        tenantSlug: 'test',
        destDir: workDir,
        log: () => {},
      })
      expect(result.ok).toBe(true)
      const copied = await readFile(
        join(workDir, 'src', 'components', 'blocks', 'WelcomeBanner.tsx'),
        'utf-8',
      )
      expect(copied).toContain('export default function WelcomeBanner')
    },
  )
})
