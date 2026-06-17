import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

import { getPayload } from 'payload'

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
      roles: ['tenant-admin'],
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

    const result = await createTenant({ name: 'X', slug: 'test', domain: 'x.com' } as any)

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
      { email: 'a@b.com', name: 'A', password: 'pw1234', role: 'tenant-admin' } as any,
      7,
    )

    expect(mockPayload.create).toHaveBeenCalledWith({
      collection: 'users',
      data: {
        email: 'a@b.com',
        name: 'A',
        password: 'pw1234',
        roles: ['tenant-admin'],
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
})
