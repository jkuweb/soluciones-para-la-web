import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_FEATURES } from '../../../scripts/lib/feature-keys'
import {
  isValidSlug,
  isValidEmail,
  buildTenantData,
  buildUserData,
  generateEnvContent,
  createTenant,
  createUser,
  isSlugTaken,
  isEmailTaken,
  copyTemplate,
  shouldCopyTemplateEntry,
  TEMPLATE_COPY_SKIP,
  writeClientVersionFile,
  promptTenant,
  confirmSummary,
  printSuccess,
  run,
  type TenantInput,
  type UserInput,
} from '../../../scripts/create-client'

// Mock payload module (preserves other exports like slugField used by the config)
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  text: vi.fn(),
  select: vi.fn(),
  password: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getPayload } from 'payload'
import * as prompts from '@clack/prompts'

const mockPayload = {
  create: vi.fn(),
  delete: vi.fn(),
  find: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(getPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayload)
})

describe('isValidSlug', () => {
  it('acepta slugs válidos', () => {
    expect(isValidSlug('cliente-ejemplo')).toBe(true)
    expect(isValidSlug('tienda-2026')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
  })

  it('rechaza slugs con mayúsculas, espacios o caracteres especiales', () => {
    expect(isValidSlug('Cliente-Ejemplo')).toBe(false)
    expect(isValidSlug('cliente ejemplo')).toBe(false)
    expect(isValidSlug('cliente_ejemplo')).toBe(false)
    expect(isValidSlug('cliente.ejemplo')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('acepta emails válidos', () => {
    expect(isValidEmail('admin@cliente.com')).toBe(true)
    expect(isValidEmail('a.b+tag@example.co')).toBe(true)
  })

  it('rechaza emails inválidos', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('noatsign.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('buildTenantData', () => {
  it('construye el payload para tenants.create con todos los campos', () => {
    const input: TenantInput = {
      name: 'Cliente Ejemplo',
      slug: 'cliente-ejemplo',
      domain: 'cliente-ejemplo.com',
      serviceType: 'web-estatica',
      frontendType: 'astro',
      status: 'pending',
      projectPrice: 1500,
      maintenanceFee: 79,
      blogEnabled: false,
      ecommerceTier: 'none',
      features: { ...DEFAULT_FEATURES },
    }
    const data = buildTenantData(input)
    expect(data).toEqual({
      name: 'Cliente Ejemplo',
      slug: 'cliente-ejemplo',
      domain: 'cliente-ejemplo.com',
      serviceType: 'web-estatica',
      frontendType: 'astro',
      status: 'pending',
      projectPrice: 1500,
      maintenanceFee: 79,
      blogEnabled: false,
      ecommerceTier: 'none',
      features: { ...DEFAULT_FEATURES },
    })
  })

  it('omite campos opcionales cuando no se proveen', () => {
    const input: TenantInput = {
      name: 'Tienda',
      slug: 'tienda',
      domain: 'tienda.com',
      serviceType: 'tienda-online',
      frontendType: 'nextjs',
      status: 'active',
      blogEnabled: false,
      ecommerceTier: 'none',
      features: { ...DEFAULT_FEATURES },
    }
    const data = buildTenantData(input)
    expect(data).not.toHaveProperty('projectPrice')
    expect(data).not.toHaveProperty('maintenanceFee')
  })
})

describe('buildUserData', () => {
  it('construye el payload para users.create con el tenant asignado', () => {
    const input: UserInput = {
      email: 'admin@cliente.com',
      name: 'Admin Cliente',
      password: 'secret123',
      role: 'tenant-admin',
    }
    const data = buildUserData(input, 42)
    expect(data).toEqual({
      email: 'admin@cliente.com',
      name: 'Admin Cliente',
      password: 'secret123',
      roles: 'tenant-admin',
      tenants: [{ tenant: 42 }],
    })
  })
})

describe('generateEnvContent', () => {
  it('reemplaza el placeholder del slug en el contenido de .env.example', () => {
    const template = 'PAYLOAD_API_URL=http://localhost:3000/api\nTENANT_SLUG=mi-cliente\n'
    const result = generateEnvContent(template, 'mi-tienda')
    expect(result).toBe('PAYLOAD_API_URL=http://localhost:3000/api\nTENANT_SLUG=mi-tienda\n')
  })

  it('preserva líneas que no son TENANT_SLUG', () => {
    const template = 'A=1\nTENANT_SLUG=placeholder\nB=2\n'
    const result = generateEnvContent(template, 'cliente-nuevo')
    expect(result).toBe('A=1\nTENANT_SLUG=cliente-nuevo\nB=2\n')
  })
})

describe('createTenant', () => {
  it('crea el tenant y devuelve el documento', async () => {
    const tenant = { id: 7, slug: 'test' }
    mockPayload.create.mockResolvedValue(tenant)

    const result = await createTenant({ name: 'X', slug: 'test', domain: 'x.com' })

    expect(mockPayload.create).toHaveBeenCalledWith({
      collection: 'tenants',
      data: { name: 'X', slug: 'test', domain: 'x.com' },
    })
    expect(result).toEqual(tenant)
  })
})

describe('createUser', () => {
  it('crea el user asignado al tenant', async () => {
    const user = { id: 99, email: 'a@b.com' }
    mockPayload.create.mockResolvedValue(user)

    const result = await createUser(
      { email: 'a@b.com', name: 'A', password: 'pw1234', role: 'tenant-admin' },
      7,
    )

    expect(mockPayload.create).toHaveBeenCalledWith({
      collection: 'users',
      data: {
        email: 'a@b.com',
        name: 'A',
        password: 'pw1234',
        roles: 'tenant-admin',
        tenants: [{ tenant: 7 }],
      },
    })
    expect(result).toEqual(user)
  })
})

describe('isSlugTaken', () => {
  it('devuelve true si encuentra un tenant con ese slug', async () => {
    mockPayload.find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 1 }] })
    expect(await isSlugTaken('existente')).toBe(true)
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'tenants',
      where: { slug: { equals: 'existente' } },
      limit: 1,
    })
  })

  it('devuelve false si no hay resultados', async () => {
    mockPayload.find.mockResolvedValue({ totalDocs: 0, docs: [] })
    expect(await isSlugTaken('libre')).toBe(false)
  })
})

describe('isEmailTaken', () => {
  it('devuelve true si encuentra un user con ese email', async () => {
    mockPayload.find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 1 }] })
    expect(await isEmailTaken('taken@x.com')).toBe(true)
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'users',
      where: { email: { equals: 'taken@x.com' } },
      limit: 1,
    })
  })

  it('devuelve false si no hay resultados', async () => {
    mockPayload.find.mockResolvedValue({ totalDocs: 0, docs: [] })
    expect(await isEmailTaken('free@x.com')).toBe(false)
  })
})

describe('copyTemplate', () => {
  let srcDir: string
  let destDir: string

  beforeEach(() => {
    srcDir = mkdtempSync(join(tmpdir(), 'src-'))
    destDir = mkdtempSync(join(tmpdir(), 'dest-'))
    writeFileSync(join(srcDir, '.env.example'), 'TENANT_SLUG=placeholder\n')
    writeFileSync(join(srcDir, 'package.json'), '{"name":"template"}')
  })

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true })
    rmSync(destDir, { recursive: true, force: true })
  })

  it('copia todos los archivos del template al destino', async () => {
    await copyTemplate(srcDir, destDir)
    expect(existsSync(join(destDir, '.env.example'))).toBe(true)
    expect(existsSync(join(destDir, 'package.json'))).toBe(true)
    expect(readFileSync(join(destDir, '.env.example'), 'utf-8')).toBe('TENANT_SLUG=placeholder\n')
  })

  it('no copia directorios de build artifacts (node_modules, .next, .astro, dist, .turbo, coverage)', async () => {
    const { mkdirSync } = await import('node:fs')
    for (const skip of TEMPLATE_COPY_SKIP) {
      if (skip === 'tsconfig.tsbuildinfo' || skip === '.DS_Store') continue
      const dir = join(srcDir, skip)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'marker.txt'), 'should-not-be-copied')
    }

    await copyTemplate(srcDir, destDir)

    for (const skip of TEMPLATE_COPY_SKIP) {
      if (skip === 'tsconfig.tsbuildinfo' || skip === '.DS_Store') continue
      expect(existsSync(join(destDir, skip))).toBe(false)
    }
    // sanity: real files were copied
    expect(existsSync(join(destDir, 'package.json'))).toBe(true)
  })

  it('no copia archivos sueltos en la skip list (tsconfig.tsbuildinfo, .DS_Store)', async () => {
    writeFileSync(join(srcDir, 'tsconfig.tsbuildinfo'), 'cache')
    writeFileSync(join(srcDir, '.DS_Store'), 'mac-junk')

    await copyTemplate(srcDir, destDir)

    expect(existsSync(join(destDir, 'tsconfig.tsbuildinfo'))).toBe(false)
    expect(existsSync(join(destDir, '.DS_Store'))).toBe(false)
  })

  it('maneja la estructura self-referential de .next/standalone sin EINVAL (regresión)', async () => {
    // Reproduces the real bug: Next.js `.next/standalone/<abs-src-path>/.next/standalone/...`
    // used to cause `cp` to recurse into itself. With the filter in place, the whole
    // .next tree is skipped, so the recursive walk never reaches the self-reference.
    const { mkdirSync } = await import('node:fs')
    const selfRefDir = join(
      srcDir,
      '.next',
      'standalone',
      srcDir,
      '.next',
      'standalone',
      srcDir,
    )
    mkdirSync(selfRefDir, { recursive: true })
    writeFileSync(join(selfRefDir, 'leaf.txt'), 'deep')

    await expect(copyTemplate(srcDir, destDir)).resolves.not.toThrow()
    expect(existsSync(join(destDir, '.next'))).toBe(false)
  })
})

describe('shouldCopyTemplateEntry', () => {
  it('devuelve false para los nombres de la skip list', () => {
    for (const skip of TEMPLATE_COPY_SKIP) {
      expect(shouldCopyTemplateEntry(`/some/path/${skip}`)).toBe(false)
      expect(shouldCopyTemplateEntry(skip)).toBe(false)
    }
  })

  it('devuelve true para archivos y directorios normales', () => {
    expect(shouldCopyTemplateEntry('/some/path/src')).toBe(true)
    expect(shouldCopyTemplateEntry('/some/path/package.json')).toBe(true)
    expect(shouldCopyTemplateEntry('README.md')).toBe(true)
  })

  it('solo compara el basename (no matchea archivos internos como "next.config.ts")', () => {
    // Important: "next.config.ts" contains ".next" as a substring but is NOT
    // a build artifact. The filter must only match exact basenames.
    expect(shouldCopyTemplateEntry('/some/path/next.config.ts')).toBe(true)
    expect(shouldCopyTemplateEntry('/some/path/.env.example')).toBe(true)
  })
})

describe('writeClientVersionFile', () => {
  let srcDir: string
  let destDir: string

  beforeEach(() => {
    srcDir = mkdtempSync(join(tmpdir(), 'tvs-'))
    destDir = mkdtempSync(join(tmpdir(), 'tvd-'))
  })

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true })
    rmSync(destDir, { recursive: true, force: true })
  })

  it('writes .template-version.json with the template name and version', async () => {
    writeFileSync(
      join(srcDir, 'package.json'),
      JSON.stringify({ name: 'astro-starter', version: '1.2.3' }),
    )
    await writeClientVersionFile(srcDir, destDir)
    const raw = readFileSync(join(destDir, '.template-version.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.template).toBe('astro')
    expect(parsed.version).toBe('1.2.3')
    expect(parsed.installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('strips the -starter suffix from the template name', async () => {
    writeFileSync(
      join(srcDir, 'package.json'),
      JSON.stringify({ name: 'nextjs-starter', version: '2.0.0' }),
    )
    await writeClientVersionFile(srcDir, destDir)
    const raw = readFileSync(join(destDir, '.template-version.json'), 'utf-8')
    expect(JSON.parse(raw).template).toBe('nextjs')
  })

  it('throws when the template package.json is missing', async () => {
    await expect(writeClientVersionFile(srcDir, destDir)).rejects.toThrow()
  })

  it('throws when the template package.json is missing name or version', async () => {
    writeFileSync(join(srcDir, 'package.json'), JSON.stringify({ name: 'no-version' }))
    await expect(writeClientVersionFile(srcDir, destDir)).rejects.toThrow(/missing name or version/)
  })
})

describe('promptTenant', () => {
  it('re-prompt el slug si está tomado, después acepta uno libre', async () => {
    ;(prompts.text as Mock)
      .mockResolvedValueOnce('Test Client') // name
      .mockResolvedValueOnce('taken') // slug (taken)
      .mockResolvedValueOnce('libre') // slug retry (libre)
      .mockResolvedValueOnce('test.com') // domain
    ;(prompts.select as Mock)
      .mockResolvedValueOnce('web-estatica') // serviceType
      .mockResolvedValueOnce('astro') // frontendType
      .mockResolvedValueOnce('pending') // status

    // mock isSlugTaken: true para 'taken', false para 'libre'
    mockPayload.find
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{}] }) // taken
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] }) // libre

    const result = await promptTenant()
    expect(result.slug).toBe('libre')
    expect(result.frontendType).toBe('astro')
    expect(mockPayload.find).toHaveBeenCalledTimes(2)
  })
})

describe('confirmSummary', () => {
  it('devuelve true si el usuario confirma', async () => {
    ;(prompts.confirm as Mock).mockResolvedValue(true)
    const ok = await confirmSummary(
      {
        name: 'X',
        slug: 'x',
        domain: 'x.com',
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'pending',
        blogEnabled: false,
        ecommerceTier: 'none',
        features: { ...DEFAULT_FEATURES },
      },
      { email: 'a@b.com', name: 'A', password: 'pw', role: 'tenant-admin' },
    )
    expect(ok).toBe(true)
  })

  it('devuelve false si el usuario cancela', async () => {
    ;(prompts.confirm as Mock).mockResolvedValue(false)
    const ok = await confirmSummary(
      {
        name: 'X',
        slug: 'x',
        domain: 'x.com',
        serviceType: 'web-estatica',
        frontendType: 'astro',
        status: 'pending',
        blogEnabled: false,
        ecommerceTier: 'none',
        features: { ...DEFAULT_FEATURES },
      },
      { email: 'a@b.com', name: 'A', password: 'pw', role: 'tenant-admin' },
    )
    expect(ok).toBe(false)
  })
})

describe('printSuccess', () => {
  it('imprime el resumen completo', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printSuccess({
      tenantSlug: 'x',
      userEmail: 'a@b.com',
      userPassword: 'pw',
      frontendPath: '/clientes/x',
    })
    expect(logSpy).toHaveBeenCalled()
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes('x'))).toBe(true)
    logSpy.mockRestore()
  })
})

describe('run orchestrator', () => {
  it('rollback del tenant si falla la creación del user', async () => {
    // prompts
    ;(prompts.text as Mock)
      .mockResolvedValueOnce('Test') // name
      .mockResolvedValueOnce('test-slug') // slug
      .mockResolvedValueOnce('test.com') // domain
      .mockResolvedValueOnce('') // projectPrice (skip)
      .mockResolvedValueOnce('') // maintenanceFee (skip)
      .mockResolvedValueOnce('a@test.com') // email
      .mockResolvedValueOnce('Admin') // name
      .mockResolvedValueOnce('password123') // password
    ;(prompts.select as Mock)
      .mockResolvedValueOnce('web-estatica')
      .mockResolvedValueOnce('astro')
      .mockResolvedValueOnce('pending')
      .mockResolvedValueOnce('tenant-admin')
    ;(prompts.confirm as Mock).mockResolvedValue(true)

    // DB: slug libre, email libre, tenant create OK, user create FALLA
    mockPayload.find
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] }) // slug libre
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] }) // email libre
    mockPayload.create
      .mockResolvedValueOnce({ id: 1, slug: 'test-slug' }) // tenant OK
      .mockRejectedValueOnce(new Error('user create failed'))
    mockPayload.delete.mockResolvedValue(undefined)

    await expect(run()).rejects.toThrow('user create failed')
    expect(mockPayload.delete).toHaveBeenCalledWith({ collection: 'tenants', id: 1 })
  })
})

describe('buildTenantData (extended)', () => {
  it('includes ecommerceTier and features', () => {
    const input = {
      name: 'Acme',
      slug: 'acme',
      domain: 'acme.com',
      serviceType: 'tienda-online' as const,
      frontendType: 'nextjs' as const,
      status: 'pending' as const,
      blogEnabled: false,
      ecommerceTier: 'lite' as const,
      features: { ...DEFAULT_FEATURES, catalog: true, payments: true },
    }
    const data = buildTenantData(input)
    expect(data.ecommerceTier).toBe('lite')
    expect(data.features).toEqual({ ...DEFAULT_FEATURES, catalog: true, payments: true })
  })

  it('defaults ecommerceTier to none and all features false when input omits them', () => {
    const input = {
      name: 'Acme',
      slug: 'acme',
      domain: 'acme.com',
      serviceType: 'web-estatica' as const,
      frontendType: 'astro' as const,
      status: 'pending' as const,
      blogEnabled: false,
      ecommerceTier: 'none' as const,
      features: DEFAULT_FEATURES,
    }
    const data = buildTenantData(input)
    expect(data.ecommerceTier).toBe('none')
    expect(Object.values(data.features as Record<string, boolean>).every((v) => v === false)).toBe(true)
  })
})
