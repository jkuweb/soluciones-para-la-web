# Create-Client Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el bash `bootstrap-cliente.sh` por un script TypeScript interactivo que cree un cliente (tenant + user) en Payload CMS y clone el template correspondiente a `/home/joseba/Clientes/clientes/<slug>/`, generando el `.env` con `TENANT_SLUG` configurado.

**Architecture:** Un solo archivo `create-client.ts` con funciones puras (validación, transformación) y side-effects (DB, fs) separados para testear con TDD. El orquestador `run()` llama a las funciones en orden. Sin creación de páginas seed — el super-admin las crea desde el admin panel.

**Tech Stack:** TypeScript, `@clack/prompts` (prompts interactivos), Payload Local API (`getPayload`), `node:fs/promises`, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-create-client-script-design.md`

---

## File Structure

| Archivo | Responsabilidad |
|---------|-----------------|
| `agencia-backend/scripts/create-client.ts` | Script principal. Exporta `run()` (orquestador) + funciones puras y side-effects para testeo. |
| `agencia-backend/tests/int/scripts/create-client.int.spec.ts` | Tests de integración con vitest. Mockea `@clack/prompts` y `getPayload`. |
| `bootstrap-cliente.sh` | **ELIMINAR** (queda obsoleto). |

---

## Conventions para todos los tasks

- **Path constants** (en el script, constantes arriba):
  ```ts
  const MONOREPO_ROOT = path.resolve(__dirname, '../../')
  const TEMPLATES_DIR = MONOREPO_ROOT
  const CLIENTS_DIR = '/home/joseba/Clientes/clientes'
  ```
- **Path alias**: el backend usa `@/*` para `src/*` (ver `tsconfig.json`). Para los scripts en `agencia-backend/scripts/`, el import correcto es `from '../src/payload.config'` (relativo) o usar el alias existente. Verificar en `tsconfig.json` y `vitest.config.mts` antes de importar.
- **Tipo de test**: integration (con DB). El setup de DB ya existe — ver `agencia-backend/tests/int/` para ejemplos.
- **Mocks**: `vi.mock('@clack/prompts', ...)`, `vi.mock('payload', ...)`.
- **Commit message style**: conventional commits, sin atribución AI.
- **Tests command**: `cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts`

---

## Task 1: Setup + utilidades de validación (puro)

**Files:**
- Create: `agencia-backend/scripts/create-client.ts`
- Create: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`
- Modify: `agencia-backend/package.json` (auto via `pnpm add -D`)

- [ ] **Step 1: Instalar `@clack/prompts`**

```bash
cd agencia-backend && pnpm add -D @clack/prompts
```

- [ ] **Step 2: Crear el test file con tests para `isValidSlug` y `isValidEmail`**

Archivo: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

```ts
import { describe, it, expect } from 'vitest'
import { isValidSlug, isValidEmail } from '../../../scripts/create-client'

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
```

- [ ] **Step 3: Correr test, verificar que FALLA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: FAIL — `Cannot find module '../../../scripts/create-client'`

- [ ] **Step 4: Crear el script con la implementación de las utilidades**

Archivo: `agencia-backend/scripts/create-client.ts`

```ts
import path from 'node:path'

// --- Constants ---
export const MONOREPO_ROOT = path.resolve(__dirname, '../../')
export const TEMPLATES_DIR = MONOREPO_ROOT
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export const SLUG_REGEX = /^[a-z0-9-]+$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// --- Pure validation utilities ---
export const isValidSlug = (slug: string): boolean =>
  typeof slug === 'string' && slug.length > 0 && SLUG_REGEX.test(slug)

export const isValidEmail = (email: string): boolean =>
  typeof email === 'string' && email.length > 0 && EMAIL_REGEX.test(email)
```

- [ ] **Step 5: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS (2 describe blocks, 4 tests passing)

- [ ] **Step 6: Commit**

```bash
git add agencia-backend/package.json pnpm-lock.yaml agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add create-client with isValidSlug and isValidEmail"
```

---

## Task 2: Funciones puras de transformación de datos

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar tests para `buildTenantData` y `buildUserData`**

Agregar al test file:

```ts
import {
  buildTenantData,
  buildUserData,
  type TenantInput,
  type UserInput,
} from '../../../scripts/create-client'

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
```

- [ ] **Step 2: Correr test, verificar que FALLA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: FAIL — `buildTenantData is not a function`

- [ ] **Step 3: Agregar los tipos y las funciones de transformación al script**

Agregar a `agencia-backend/scripts/create-client.ts`:

```ts
// --- Types ---
export type ServiceType = 'web-estatica' | 'tienda-online' | 'academia-online'
export type FrontendType = 'astro' | 'nextjs'
export type TenantStatus = 'pending' | 'active' | 'suspended'
export type UserRole = 'tenant-admin' | 'tenant-editor'

export type TenantInput = {
  name: string
  slug: string
  domain: string
  serviceType: ServiceType
  frontendType: FrontendType
  status: TenantStatus
  projectPrice?: number
  maintenanceFee?: number
}

export type UserInput = {
  email: string
  name: string
  password: string
  role: UserRole
}

// --- Pure data builders ---
export const buildTenantData = (input: TenantInput): Record<string, unknown> => {
  const data: Record<string, unknown> = {
    name: input.name,
    slug: input.slug,
    domain: input.domain,
    serviceType: input.serviceType,
    frontendType: input.frontendType,
    status: input.status,
  }
  if (input.projectPrice !== undefined) data.projectPrice = input.projectPrice
  if (input.maintenanceFee !== undefined) data.maintenanceFee = input.maintenanceFee
  return data
}

export const buildUserData = (input: UserInput, tenantId: number): Record<string, unknown> => ({
  email: input.email,
  name: input.name,
  password: input.password,
  roles: [input.role],
  tenants: [{ tenant: tenantId }],
})
```

- [ ] **Step 4: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS (todos los tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add buildTenantData and buildUserData"
```

---

## Task 3: generateEnvContent (puro) + tests

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar tests para `generateEnvContent`**

```ts
import { generateEnvContent } from '../../../scripts/create-client'

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
```

- [ ] **Step 2: Correr test, verificar que FALLA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: FAIL — `generateEnvContent is not a function`

- [ ] **Step 3: Implementar `generateEnvContent`**

Agregar a `create-client.ts`:

```ts
export const generateEnvContent = (template: string, slug: string): string =>
  template.replace(/^TENANT_SLUG=.*$/m, `TENANT_SLUG=${slug}`)
```

- [ ] **Step 4: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add generateEnvContent"
```

---

## Task 4: createTenant + createUser (con rollback) + tests con mock de getPayload

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar tests para `createTenant` y `createUser` con `vi.mock`**

Agregar al top del test file:

```ts
import { vi, beforeEach } from 'vitest'
import { createTenant, createUser } from '../../../scripts/create-client'

// Mock payload module
vi.mock('payload', () => ({
  getPayload: vi.fn(),
}))

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
```

- [ ] **Step 2: Correr test, verificar que FALLA**

Expected: FAIL — `createTenant is not a function`

- [ ] **Step 3: Implementar `createTenant` y `createUser`**

Agregar a `create-client.ts`:

```ts
import { getPayload } from 'payload'
import config from '../src/payload.config'

export const createTenant = async (
  data: ReturnType<typeof buildTenantData>,
): Promise<{ id: number }> => {
  const payload = await getPayload({ config })
  return payload.create({ collection: 'tenants', data: data as never }) as Promise<{ id: number }>
}

export const createUser = async (
  input: UserInput,
  tenantId: number,
): Promise<{ id: number }> => {
  const payload = await getPayload({ config })
  return payload.create({
    collection: 'users',
    data: buildUserData(input, tenantId) as never,
  }) as Promise<{ id: number }>
}

export const deleteTenant = async (tenantId: number): Promise<void> => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'tenants', id: tenantId })
}
```

- [ ] **Step 4: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add createTenant and createUser with payload integration"
```

---

## Task 5: isSlugTaken + isEmailTaken (validación contra DB)

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar tests para `isSlugTaken` y `isEmailTaken`**

```ts
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
```

- [ ] **Step 2: Correr test, verificar que FALLA**

Expected: FAIL

- [ ] **Step 3: Implementar `isSlugTaken` e `isEmailTaken`**

```ts
export const isSlugTaken = async (slug: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.totalDocs > 0
}

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  return result.totalDocs > 0
}
```

- [ ] **Step 4: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add isSlugTaken and isEmailTaken DB validators"
```

---

## Task 6: copyTemplate (filesystem) + tests con directorio temporal

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar test para `copyTemplate` usando `os.tmpdir()`**

```ts
import { copyTemplate } from '../../../scripts/create-client'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
```

- [ ] **Step 2: Correr test, verificar que FALLA**

Expected: FAIL — `copyTemplate is not a function`

- [ ] **Step 3: Implementar `copyTemplate`**

```ts
import { cp } from 'node:fs/promises'

export const copyTemplate = async (srcDir: string, destDir: string): Promise<void> => {
  await cp(srcDir, destDir, { recursive: true })
}
```

- [ ] **Step 4: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add copyTemplate"
```

---

## Task 7: promptTenant + promptUser (interactivos, con @clack/prompts mockeado)

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar mock de `@clack/prompts` y tests para `promptTenant`**

```ts
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

import * as prompts from '@clack/prompts'
import { promptTenant, promptUser } from '../../../scripts/create-client'

describe('promptTenant', () => {
  it('re-prompt el slug si está tomado, después acepta uno libre', async () => {
    ;(prompts.text as any)
      .mockResolvedValueOnce('Test Client')       // name
      .mockResolvedValueOnce('taken')              // slug (taken)
      .mockResolvedValueOnce('libre')              // slug retry (libre)
      .mockResolvedValueOnce('test.com')           // domain
    ;(prompts.select as any)
      .mockResolvedValueOnce('web-estatica')       // serviceType
      .mockResolvedValueOnce('astro')              // frontendType
      .mockResolvedValueOnce('pending')            // status

    // mock isSlugTaken: true para 'taken', false para 'libre'
    mockPayload.find
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{}] })  // taken
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] })   // libre

    const result = await promptTenant()
    expect(result.slug).toBe('libre')
    expect(result.frontendType).toBe('astro')
    expect(mockPayload.find).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Correr test, verificar que FALLA**

Expected: FAIL

- [ ] **Step 3: Implementar `promptTenant`**

```ts
import * as p from '@clack/prompts'

const promptUntilFree = async <T>(
  fetcher: () => Promise<T>,
  isTaken: (v: T) => Promise<boolean>,
  invalidMessage: string,
): Promise<T> => {
  for (;;) {
    const value = await fetcher()
    if (p.isCancel(value)) {
      p.cancel('Operación cancelada.')
      process.exit(0)
    }
    if (!(await isTaken(value))) return value
    p.log.warn(invalidMessage)
  }
}

export const promptTenant = async (): Promise<TenantInput> => {
  const name = await p.text({ message: 'Nombre del cliente:' })
  if (p.isCancel(name)) process.exit(0)

  const slug = await promptUntilFree(
    () =>
      p.text({
        message: 'Slug (sin espacios, solo minúsculas/números/guiones):',
        validate: (v) => isValidSlug(v) || 'Formato inválido',
      }) as Promise<string>,
    isSlugTaken,
    'Ese slug ya existe, probá con otro.',
  )

  const domain = await p.text({ message: 'Dominio (ej: cliente.com):' })
  if (p.isCancel(domain)) process.exit(0)

  const serviceType = (await p.select({
    message: 'Tipo de servicio:',
    options: [
      { value: 'web-estatica', label: 'Web Estática' },
      { value: 'tienda-online', label: 'Tienda Online' },
      { value: 'academia-online', label: 'Academia Online' },
    ],
  })) as ServiceType

  const frontendType = (await p.select({
    message: 'Tipo de frontend:',
    options: [
      { value: 'astro', label: 'Astro' },
      { value: 'nextjs', label: 'Next.js' },
    ],
  })) as FrontendType

  const status = (await p.select({
    message: 'Estado:',
    initialValue: 'pending' as TenantStatus,
    options: [
      { value: 'pending', label: 'Pendiente' },
      { value: 'active', label: 'Activo' },
      { value: 'suspended', label: 'Suspendido' },
    ],
  })) as TenantStatus

  const projectPriceStr = await p.text({
    message: 'Precio del proyecto (Enter para omitir):',
  })
  if (p.isCancel(projectPriceStr)) process.exit(0)

  const maintenanceFeeStr = await p.text({
    message: 'Cuota mensual (Enter para omitir):',
  })
  if (p.isCancel(maintenanceFeeStr)) process.exit(0)

  return {
    name: String(name),
    slug,
    domain: String(domain),
    serviceType,
    frontendType,
    status,
    projectPrice: projectPriceStr ? Number(projectPriceStr) : undefined,
    maintenanceFee: maintenanceFeeStr ? Number(maintenanceFeeStr) : undefined,
  }
}
```

- [ ] **Step 4: Implementar `promptUser`**

```ts
export const promptUser = async (): Promise<UserInput> => {
  const email = await promptUntilFree(
    () =>
      p.text({
        message: 'Email del admin del cliente:',
        validate: (v) => isValidEmail(v) || 'Email inválido',
      }) as Promise<string>,
    isEmailTaken,
    'Ese email ya existe, probá con otro.',
  )

  const name = await p.text({ message: 'Nombre del admin:' })
  if (p.isCancel(name)) process.exit(0)

  const password = await p.password({
    message: 'Password (mínimo 8 caracteres):',
    validate: (v) => v.length >= 8 || 'Mínimo 8 caracteres',
  })
  if (p.isCancel(password)) process.exit(0)

  const role = (await p.select({
    message: 'Rol:',
    initialValue: 'tenant-admin' as UserRole,
    options: [
      { value: 'tenant-admin', label: 'Tenant Admin' },
      { value: 'tenant-editor', label: 'Tenant Editor' },
    ],
  })) as UserRole

  return { email, name: String(name), password: String(password), role }
}
```

- [ ] **Step 5: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add promptTenant and promptUser with clack"
```

---

## Task 8: confirmSummary + printSuccess (output)

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar tests para `confirmSummary` y `printSuccess`**

```ts
import { confirmSummary, printSuccess } from '../../../scripts/create-client'

describe('confirmSummary', () => {
  it('devuelve true si el usuario confirma', async () => {
    ;(prompts.confirm as any).mockResolvedValue(true)
    const ok = await confirmSummary(
      { name: 'X', slug: 'x', domain: 'x.com', serviceType: 'web-estatica', frontendType: 'astro', status: 'pending' },
      { email: 'a@b.com', name: 'A', password: 'pw', role: 'tenant-admin' },
    )
    expect(ok).toBe(true)
  })

  it('devuelve false si el usuario cancela', async () => {
    ;(prompts.confirm as any).mockResolvedValue(false)
    const ok = await confirmSummary(
      { name: 'X', slug: 'x', domain: 'x.com', serviceType: 'web-estatica', frontendType: 'astro', status: 'pending' } as any,
      { email: 'a@b.com', name: 'A', password: 'pw', role: 'tenant-admin' } as any,
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
```

- [ ] **Step 2: Correr test, verificar que FALLA**

Expected: FAIL

- [ ] **Step 3: Implementar `confirmSummary` y `printSuccess`**

```ts
export const confirmSummary = async (
  tenant: TenantInput,
  user: UserInput,
): Promise<boolean> => {
  console.log('\n--- Resumen ---')
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`)
  console.log(`  domain: ${tenant.domain}`)
  console.log(`  serviceType: ${tenant.serviceType}`)
  console.log(`  frontendType: ${tenant.frontendType}`)
  console.log(`  status: ${tenant.status}`)
  if (tenant.projectPrice) console.log(`  projectPrice: €${tenant.projectPrice}`)
  if (tenant.maintenanceFee) console.log(`  maintenanceFee: €${tenant.maintenanceFee}`)
  console.log(`User: ${user.email} (${user.role})`)
  console.log('----------------\n')

  const ok = await p.confirm({ message: '¿Crear cliente con estos datos?' })
  if (p.isCancel(ok)) return false
  return ok === true
}

export const printSuccess = (info: {
  tenantSlug: string
  userEmail: string
  userPassword: string
  frontendPath: string
}): void => {
  console.log('\n========================================')
  console.log('  Cliente creado!')
  console.log('========================================')
  console.log(`  Tenant:     ${info.tenantSlug}`)
  console.log(`  User:       ${info.userEmail} / ${info.userPassword}`)
  console.log(`  Frontend:   ${info.frontendPath}`)
  console.log('  Próximos pasos:')
  console.log('    1. Crear las páginas en el admin de Payload')
  console.log(`    2. cd ${info.frontendPath}`)
  console.log('    3. pnpm install')
  console.log('    4. Editar src/styles/theme.css con los colores del cliente')
  console.log('    5. pnpm dev')
  console.log('========================================\n')
}
```

- [ ] **Step 4: Correr test, verificar que PASA**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add confirmSummary and printSuccess"
```

---

## Task 9: run() orchestrator + manejo de rollback

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts`
- Modify: `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

- [ ] **Step 1: Agregar test de integración del orquestador con rollback**

```ts
describe('run orchestrator', () => {
  it('rollback del tenant si falla la creación del user', async () => {
    // prompts
    ;(prompts.text as any)
      .mockResolvedValueOnce('Test')                 // name
      .mockResolvedValueOnce('test-slug')            // slug
      .mockResolvedValueOnce('test.com')             // domain
      .mockResolvedValueOnce('')                     // projectPrice (skip)
      .mockResolvedValueOnce('')                     // maintenanceFee (skip)
      .mockResolvedValueOnce('a@test.com')           // email
      .mockResolvedValueOnce('Admin')                // name
      .mockResolvedValueOnce('password123')          // password
    ;(prompts.select as any)
      .mockResolvedValueOnce('web-estatica')
      .mockResolvedValueOnce('astro')
      .mockResolvedValueOnce('pending')
      .mockResolvedValueOnce('tenant-admin')
    ;(prompts.confirm as any).mockResolvedValue(true)

    // DB: slug libre, email libre, tenant create OK, user create FALLA
    mockPayload.find
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] })   // slug libre
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] })   // email libre
    mockPayload.create
      .mockResolvedValueOnce({ id: 1, slug: 'test-slug' })  // tenant OK
      .mockRejectedValueOnce(new Error('user create failed'))
    mockPayload.delete.mockResolvedValue(undefined)

    await expect(run()).rejects.toThrow('user create failed')
    expect(mockPayload.delete).toHaveBeenCalledWith({ collection: 'tenants', id: 1 })
  })
})
```

- [ ] **Step 2: Correr test, verificar que FALLA**

Expected: FAIL

- [ ] **Step 3: Implementar `run()` con manejo de rollback**

```ts
import { readFile, writeFile } from 'node:fs/promises'

export const run = async (): Promise<void> => {
  p.intro('Crear nuevo cliente')

  const tenantInput = await promptTenant()
  const userInput = await promptUser()
  const confirmed = await confirmSummary(tenantInput, userInput)
  if (!confirmed) {
    p.cancel('Cancelado.')
    return
  }

  // 1. Crear tenant
  let tenant: { id: number; slug: string }
  try {
    tenant = await createTenant(buildTenantData(tenantInput))
  } catch (err) {
    p.log.error(`No se pudo crear el tenant: ${(err as Error).message}`)
    throw err
  }
  p.log.success(`Tenant creado (ID: ${tenant.id})`)

  // 2. Crear user (con rollback si falla)
  let user: { id: number; email: string }
  try {
    user = await createUser(userInput, tenant.id)
  } catch (err) {
    p.log.error(`No se pudo crear el user, haciendo rollback del tenant...`)
    await deleteTenant(tenant.id)
    throw err
  }
  p.log.success(`User creado: ${user.email}`)

  // 3. Clonar template + generar .env
  const srcDir = path.join(TEMPLATES_DIR, `${tenantInput.frontendType}-starter`)
  const destDir = path.join(CLIENTS_DIR, tenantInput.slug)
  try {
    await copyTemplate(srcDir, destDir)
    const envExample = await readFile(path.join(destDir, '.env.example'), 'utf-8')
    await writeFile(path.join(destDir, '.env'), generateEnvContent(envExample, tenantInput.slug), 'utf-8')
    p.log.success(`Frontend clonado en ${destDir}`)
  } catch (err) {
    p.log.warn(`Tenant y user quedaron en DB, pero la copia del template falló: ${(err as Error).message}`)
    p.log.warn(`Reintentá manualmente: cp -r ${srcDir} ${destDir}`)
    return
  }

  p.outro('Listo.')
  printSuccess({
    tenantSlug: tenantInput.slug,
    userEmail: userInput.email,
    userPassword: userInput.password,
    frontendPath: destDir,
  })
}

void run().then(
  () => process.exit(0),
  (err) => {
    p.log.error((err as Error).message)
    process.exit(1)
  },
)
```

- [ ] **Step 4: Correr test, verificar que PASA**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS

- [ ] **Step 5: Typecheck**

```bash
cd agencia-backend && pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 6: Lint**

```bash
cd agencia-backend && pnpm lint
```

Expected: 0 errors (o solo warnings preexistentes)

- [ ] **Step 7: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): add run orchestrator with rollback"
```

---

## Task 10: Borrar el bash obsoleto y verificar end-to-end

**Files:**
- Delete: `bootstrap-cliente.sh`

- [ ] **Step 1: Confirmar que el script TS funciona con un cliente de prueba**

Levantar la DB:

```bash
docker compose -f agencia-backend/docker-compose.yml up -d postgres
```

Correr el script con respuestas de prueba (vía stdin):

```bash
cd agencia-backend
echo -e "Test\ntest-slug\ntest.com\n\n\n\nadmin@test.com\nAdmin\npassword123\n\ny" | pnpm tsx scripts/create-client.ts
```

Verificar en el admin de Payload que el tenant `test-slug` y el user `admin@test.com` existen.

Verificar que `/home/joseba/Clientes/clientes/test-slug/` existe con el `.env` correcto:

```bash
cat /home/joseba/Clientes/clientes/test-slug/.env
```

Expected: contiene `TENANT_SLUG=test-slug`

- [ ] **Step 2: Limpiar el cliente de prueba**

```bash
rm -rf /home/joseba/Clientes/clientes/test-slug
```

Y borrar el tenant+user del admin de Payload (o directo en DB).

- [ ] **Step 3: Borrar el bash obsoleto**

```bash
git rm bootstrap-cliente.sh
git commit -m "chore(scripts): remove obsolete bash bootstrap-cliente.sh"
```

- [ ] **Step 4: Verificar que el repo está limpio**

```bash
git log --oneline -10
git status
```

Expected: log muestra los commits de los tasks anteriores + el de eliminación del bash. `git status` limpio.

---

## Self-Review

**1. Spec coverage:**
- § 3.1 (ubicación): Task 1 ✓
- § 3.2 (deps): Task 1 Step 1 ✓
- § 3.3 (rutas): Task 1 Step 4 ✓
- § 3.4 (estructura interna): Tasks 1-9 ✓
- § 3.5 (flujo): Task 9 ✓
- § 3.6 (errores/rollback): Task 9 Step 3 + Task 9 Step 1 test ✓
- § 3.7 (output): Task 8 Step 3 ✓
- § 4 (testing): Tasks 1-9 (todos los funciones puras y side-effects testeados) ✓
- § 5 (decisiones): todas reflejadas en la implementación ✓
- § 6 (próximos pasos): Task 10 ✓

**2. Placeholder scan:** No hay TBDs, TODOs, ni código diferido. Todo el código está en los steps.

**3. Type consistency:** `isValidSlug`, `isValidEmail`, `buildTenantData`, `buildUserData`, `generateEnvContent`, `createTenant`, `createUser`, `deleteTenant`, `isSlugTaken`, `isEmailTaken`, `copyTemplate`, `confirmSummary`, `printSuccess`, `promptTenant`, `promptUser`, `run` — todos los nombres consistentes entre tasks. `TenantInput`/`UserInput`/`TenantStatus`/`UserRole`/`ServiceType`/`FrontendType` consistentes.

**4. Verification:** El último task (Task 10) incluye verificación end-to-end con un cliente de prueba real y limpieza.

---

**Plan completo y guardado en** `docs/superpowers/plans/2026-06-17-create-client-script.md`.

**Dos opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — Despacho un subagente fresh por task, review entre tasks, iteración rápida.
2. **Inline Execution** — Ejecuto los tasks en esta sesión con checkpoints.

¿Cuál preferís?
