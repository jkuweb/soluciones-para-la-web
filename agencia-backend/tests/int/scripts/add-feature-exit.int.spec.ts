import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path, { join } from 'node:path'
import { getPayload } from 'payload'
import config from '@/payload.config'

const HANG_TIMEOUT_MS = 10_000
const TEST_TIMEOUT_MS = 20_000
const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

let testTenantSlug: string

beforeAll(async () => {
  const payload = await getPayload({ config })
  const slug = `exit-test-${Date.now()}`
  await payload.create({
    collection: 'tenants',
    data: {
      name: `Exit Test ${slug}`,
      slug,
      domain: `${slug}.test`,
      serviceType: 'tienda-online',
      frontendType: 'nextjs',
      status: 'pending',
      ecommerceTier: 'none',
      features: {},
      blogEnabled: false,
    },
  })
  testTenantSlug = slug
  await mkdir(join(CLIENTS_DIR, slug, 'src/components/blocks'), {
    recursive: true,
  })
})

afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'tenants',
    where: { slug: { equals: testTenantSlug } },
  })
  await rm(join(CLIENTS_DIR, testTenantSlug), { recursive: true, force: true })
})

const runScriptAsChild = (args: string[]): Promise<number> =>
  new Promise((resolve, reject) => {
    const loaderPath = path.resolve(process.cwd(), 'scripts/loaders/run-with-css.mjs')
    const scriptPath = path.resolve(process.cwd(), 'scripts/add-feature.ts')
    const child: ChildProcess = spawn('node', [loaderPath, scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    const killTimer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Script hung: did not exit within ${HANG_TIMEOUT_MS}ms. stderr:\n${stderr}`))
    }, HANG_TIMEOUT_MS)

    child.on('exit', (code) => {
      clearTimeout(killTimer)
      resolve(code ?? -1)
    })
    child.on('error', (err) => {
      clearTimeout(killTimer)
      reject(err)
    })
  })

describe('add-feature script exits cleanly', () => {
  it(
    '--status exits with code 0 (does not hang on Payload DB pool)',
    async () => {
      const exitCode = await runScriptAsChild(['--status', `--slug=${testTenantSlug}`])
      expect(exitCode).toBe(0)
    },
    TEST_TIMEOUT_MS,
  )

  it(
    'enable welcome-banner exits with code 0',
    async () => {
      const exitCode = await runScriptAsChild(['welcomeBanner', `--slug=${testTenantSlug}`])
      expect(exitCode).toBe(0)
    },
    TEST_TIMEOUT_MS,
  )

  it(
    'disable welcome-banner exits with code 0 (--remove)',
    async () => {
      const exitCode = await runScriptAsChild([
        'welcomeBanner',
        `--slug=${testTenantSlug}`,
        '--remove',
      ])
      expect(exitCode).toBe(0)
    },
    TEST_TIMEOUT_MS,
  )
})
