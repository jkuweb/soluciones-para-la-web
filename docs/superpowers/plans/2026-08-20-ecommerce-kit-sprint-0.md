# ecommerce-kit Sprint 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Infrastructure for the modular ecommerce system — `Tenants` extends with `ecommerceTier` (select) and `features` (JSON), `create-client.ts` asks about ecommerce tier when `serviceType === 'tienda-online'`, `add-feature.ts` script base works (enable/disable/status), and `scripts/features/` folder exists with one stub per feature ready to be implemented in later sprints.

**Architecture:** Replicate the `blogEnabled` pattern that already works: super-admin decides what the tenant has via the admin (or via CLI), tenant inherits from there. Pure functions and DB side-effects are separated so each piece is unit-testable. Features registry (`scripts/features/index.ts`) is the single source of truth — `add-feature` looks up the feature there and delegates install/uninstall to per-feature scripts. Features that aren't implemented yet (everything in Sprint 0) use a shared stub that just toggles the flag and logs "not implemented".

**Tech Stack:** Payload CMS 3.85.1, TypeScript strict, `@clack/prompts`, Vitest, PostgreSQL (plugin multi-tenant), `tsx` via `run-with-css.mjs`, path alias `@/*`.

**Spec:** `docs/superpowers/specs/2026-08-20-ecommerce-kit-design.md`

---

## File Structure

### Crear

| Archivo | Responsabilidad |
| --- | --- |
| `agencia-backend/scripts/features/index.ts` | Registry de todas las features. Exporta `FEATURES` (record por slug) y `getFeature(slug)`. Single source of truth. |
| `agencia-backend/scripts/features/_stub.ts` | `installStub` y `uninstallStub` para features no implementadas. Solo togglean el flag y loggean "not implemented yet". |
| `agencia-backend/scripts/features/{catalog,payments,shipping,coupons,reviews,wishlist,taxes,abandoned-cart,subscriptions}/{install.ts,uninstall.ts,README.md}` | Una carpeta por feature. En Sprint 0 todas exportan desde `_stub.ts`. Las implementaciones reales llegan en sprints siguientes. |
| `agencia-backend/scripts/add-feature.ts` | Script CLI. Parsea args, lee el tenant por slug, delega a `features/<x>/install.ts` o `uninstall.ts`. Soporta `--status`, `--remove`, `--filter`. |
| `agencia-backend/scripts/lib/feature-keys.ts` | Helpers puros: `ECOMMERCE_TIERS`, `FEATURE_KEYS`, `defaultFeaturesForTier`, `isValidEcommerceTier`, `isValidFeatureName`. |
| `agencia-backend/tests/int/scripts/add-feature.int.spec.ts` | Cobertura int: tenant lookup, enable/disable, idempotencia, status, errores. |

### Modificar

| Archivo | Cambio |
| --- | --- |
| `agencia-backend/src/collections/Tenants.ts` | Agregar campo `ecommerceTier` (select: `none` \| `lite` \| `standard` \| `full`) y `features` (json con defaults). Sidebar. `access.update` super-admin-only (igual que `blogEnabled`). |
| `agencia-backend/scripts/create-client.ts` | Exportar `ECOMMERCE_TIERS`, `FEATURE_KEYS`, `defaultFeaturesForTier`, `isValidEcommerceTier`. Agregar `promptEcommerceTier()` (llamado solo cuando `serviceType === 'tienda-online'`). Extender `TenantInput` y `buildTenantData` con `ecommerceTier` y `features`. Actualizar `confirmSummary` para mostrar el tier. |
| `agencia-backend/package.json` | Agregar script `add-feature`. |

### Regenerar

| Archivo | Por qué |
| --- | --- |
| `agencia-backend/src/payload-types.ts` | Auto-generado por `pnpm generate:types:shimmed` para reflejar los nuevos campos en `Tenant`. No editar a mano. |

### No tocar

- `agencia-backend/src/plugins/index.ts` — el plugin multi-tenant no cambia.
- Frontends Astro/Next — Sprint 0 no toca el frontend.
- Collections de ecommerce (Products, Categories, Orders, Customers) — esas llegan en Sprint 1+.

---

## Decisiones técnicas (heredadas del spec, con detalles de implementación)

1. **`features` como JSON, no checkboxes** — extensible sin migrar schema. Trade-off conocido: admin UI menos linda, pero los access controls leen string keys directo desde `tenant.features.<x>`.
2. **Default `false` en todas las features** — coherente con `blogEnabled`.
3. **`access.update` super-admin-only en `ecommerceTier` y `features`** — el campo define qué tiene el cliente; lo decide el producto.
4. **Registry central en `scripts/features/index.ts`** — `add-feature` no hardcodea lista de features, las lee del registry. Agregar una feature nueva = agregar carpeta + entry en el registry.
5. **Stubs en Sprint 0** — todas las features usan `_stub.ts` hasta que se implementen en sus sprints. Esto permite que `add-feature` funcione end-to-end desde el día 1 (testea infra, no feature).
6. **Sin dependencias entre features declaradas formalmente todavía** — Sprint 0 no las necesita. Si Sprint 3 (shipping) requiere `catalog`, se valida en runtime con un check explícito en el `install.ts` de esa feature, no en el registry.
7. **Pure functions + DB side-effects separados** — mismo patrón que `create-client.ts`. Permite testear todo lo puro sin DB.
8. **`add-feature --slug=foo` resuelve el tenant por slug exacto** — sin `--filter` que matchee múltiples, `--filter` solo se usa en combinación con `--status` o para bulk operations (bulk enable queda fuera de Sprint 0, queda el hook listo para Sprint futuro).
9. **`--status` no modifica nada** — solo lee y muestra. Idempotente por naturaleza.
10. **Rollback: si la copia de archivos falla, deja `features.<x>` como estaba** — el install de la feature debe ser transaccional respecto al patch del tenant. Como el patch es una sola operación `payload.update`, no hay race condition.
11. **No commit de los `payload-types.ts` si son muy grandes** — siguen el patrón de commits existentes (commit único con `feat(tenants): ...` que incluye el regen).

---

## Conventions para todos los tasks

- **Path constants**: usar los ya existentes en `create-client.ts` (`MONOREPO_ROOT`, `TEMPLATES_DIR`, `CLIENTS_DIR`).
- **Path alias**: `@/*` solo para `src/*` (ver `tsconfig.json`). En tests usar imports relativos desde `tests/int/scripts/`: `from '../../../scripts/<archivo>'` — patrón ya en uso en `create-client.int.spec.ts`. En scripts mismos, imports relativos entre archivos del mismo directorio (`./lib/feature-keys`); para el payload config, `from '@/payload.config'` (sí funciona porque `@payload-config` está mapeado).
- **Mocks**: `vi.mock('@clack/prompts', ...)`, `vi.mock('payload', ...)` — mismo patrón que `tests/int/scripts/create-client.int.spec.ts`.
- **Test command**: `cd agencia-backend && pnpm test:int -- --run <ruta del spec>`.
- **Commit message style**: conventional commits en inglés, sin atribución AI.
- **Cada task termina con un commit** — ningún cambio queda sin commitear entre tasks.

---

## Tareas

### Task 1: Helpers puros `feature-keys.ts`

**Files:**
- Create: `agencia-backend/scripts/lib/feature-keys.ts`
- Create: `agencia-backend/tests/int/scripts/lib/feature-keys.int.spec.ts`

- [ ] **Step 1: Crear el archivo con las constantes y helpers puros**

```typescript
// agencia-backend/scripts/lib/feature-keys.ts

export const ECOMMERCE_TIERS = ['none', 'lite', 'standard', 'full'] as const
export type EcommerceTier = (typeof ECOMMERCE_TIERS)[number]

export const FEATURE_KEYS = [
  'catalog',
  'payments',
  'shipping',
  'coupons',
  'reviews',
  'wishlist',
  'taxes',
  'abandonedCart',
  'subscriptions',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const TIER_DEFAULTS: Record<EcommerceTier, FeatureKey[]> = {
  none: [],
  lite: ['catalog', 'payments'],
  standard: ['catalog', 'payments', 'shipping', 'coupons'],
  full: [
    'catalog',
    'payments',
    'shipping',
    'coupons',
    'reviews',
    'wishlist',
    'taxes',
  ],
}

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  catalog: false,
  payments: false,
  shipping: false,
  coupons: false,
  reviews: false,
  wishlist: false,
  taxes: false,
  abandonedCart: false,
  subscriptions: false,
}

export const isValidEcommerceTier = (value: unknown): value is EcommerceTier =>
  typeof value === 'string' && (ECOMMERCE_TIERS as readonly string[]).includes(value)

export const isValidFeatureName = (value: unknown): value is FeatureKey =>
  typeof value === 'string' && (FEATURE_KEYS as readonly string[]).includes(value)

export const defaultFeaturesForTier = (tier: EcommerceTier): Record<FeatureKey, boolean> => {
  const features = { ...DEFAULT_FEATURES }
  for (const key of TIER_DEFAULTS[tier]) features[key] = true
  return features
}

export const isValidFeaturesObject = (
  features: unknown,
): features is Record<FeatureKey, boolean> => {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return false
  for (const key of FEATURE_KEYS) {
    if (!(key in features)) return false
    if (typeof (features as Record<string, unknown>)[key] !== 'boolean') return false
  }
  return true
}
```

- [ ] **Step 2: Crear el spec con tests puros**

```typescript
// agencia-backend/tests/int/scripts/lib/feature-keys.int.spec.ts
import { describe, it, expect } from 'vitest'
import {
  ECOMMERCE_TIERS,
  FEATURE_KEYS,
  TIER_DEFAULTS,
  DEFAULT_FEATURES,
  isValidEcommerceTier,
  isValidFeatureName,
  defaultFeaturesForTier,
  isValidFeaturesObject,
} from '../../../scripts/lib/feature-keys'

describe('feature-keys', () => {
  describe('constants', () => {
    it('exports the four expected tiers', () => {
      expect(ECOMMERCE_TIERS).toEqual(['none', 'lite', 'standard', 'full'])
    })

    it('exports the nine expected feature keys', () => {
      expect(FEATURE_KEYS).toHaveLength(9)
      expect(FEATURE_KEYS).toContain('catalog')
      expect(FEATURE_KEYS).toContain('payments')
    })

    it('every feature key has a default of false', () => {
      for (const key of FEATURE_KEYS) {
        expect(DEFAULT_FEATURES[key]).toBe(false)
      }
    })
  })

  describe('isValidEcommerceTier', () => {
    it('accepts valid tiers', () => {
      for (const tier of ECOMMERCE_TIERS) {
        expect(isValidEcommerceTier(tier)).toBe(true)
      }
    })

    it('rejects unknown values', () => {
      expect(isValidEcommerceTier('pro')).toBe(false)
      expect(isValidEcommerceTier('')).toBe(false)
      expect(isValidEcommerceTier(null)).toBe(false)
      expect(isValidEcommerceTier(42)).toBe(false)
    })
  })

  describe('isValidFeatureName', () => {
    it('accepts valid feature keys', () => {
      for (const key of FEATURE_KEYS) {
        expect(isValidFeatureName(key)).toBe(true)
      }
    })

    it('rejects unknown feature names', () => {
      expect(isValidFeatureName('blog')).toBe(false)
      expect(isValidFeatureName('Catalog')).toBe(false) // case-sensitive
      expect(isValidFeatureName('')).toBe(false)
    })
  })

  describe('defaultFeaturesForTier', () => {
    it('returns all false for tier "none"', () => {
      const features = defaultFeaturesForTier('none')
      expect(features.catalog).toBe(false)
      expect(features.payments).toBe(false)
      expect(Object.values(features).every((v) => v === false)).toBe(true)
    })

    it('returns catalog + payments for tier "lite"', () => {
      const features = defaultFeaturesForTier('lite')
      expect(features.catalog).toBe(true)
      expect(features.payments).toBe(true)
      expect(features.shipping).toBe(false)
    })

    it('returns catalog + payments + shipping + coupons for tier "standard"', () => {
      const features = defaultFeaturesForTier('standard')
      expect(TIER_DEFAULTS.standard.every((k) => features[k])).toBe(true)
    })

    it('returns a fresh object each call (no shared mutation)', () => {
      const a = defaultFeaturesForTier('lite')
      const b = defaultFeaturesForTier('lite')
      a.catalog = false
      expect(b.catalog).toBe(true)
    })
  })

  describe('isValidFeaturesObject', () => {
    it('accepts a complete features object', () => {
      expect(isValidFeaturesObject({ ...DEFAULT_FEATURES, catalog: true })).toBe(true)
    })

    it('rejects objects missing keys', () => {
      const incomplete: Record<string, unknown> = { ...DEFAULT_FEATURES }
      delete incomplete.catalog
      expect(isValidFeaturesObject(incomplete)).toBe(false)
    })

    it('rejects objects with non-boolean values', () => {
      expect(isValidFeaturesObject({ ...DEFAULT_FEATURES, catalog: 'yes' as unknown as boolean })).toBe(false)
    })

    it('rejects null, arrays, and primitives', () => {
      expect(isValidFeaturesObject(null)).toBe(false)
      expect(isValidFeaturesObject([])).toBe(false)
      expect(isValidFeaturesObject('foo')).toBe(false)
    })
  })
})
```

- [ ] **Step 3: Correr el test**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/lib/feature-keys.int.spec.ts
```

Expected: PASS — los 14 tests verdes.

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/scripts/lib/feature-keys.ts agencia-backend/tests/int/scripts/lib/feature-keys.int.spec.ts
git commit -m "feat(scripts): add pure helpers for ecommerce tiers and feature keys"
```

---

### Task 2: Agregar `ecommerceTier` y `features` a `Tenants`

**Files:**
- Modify: `agencia-backend/src/collections/Tenants.ts:28-120`
- Regenerate: `agencia-backend/src/payload-types.ts`

- [ ] **Step 1: Editar `Tenants.ts` agregando los dos campos**

Localizar el cierre del array `fields` en `Tenants.ts` (línea ~120) y agregar antes del `]`, justo después del bloque `blogEnabled`:

```typescript
    {
      name: 'ecommerceTier',
      type: 'select',
      options: [
        { label: 'Sin ecommerce', value: 'none' },
        { label: 'Lite (catálogo + Stripe)', value: 'lite' },
        { label: 'Standard (+ envíos + cupones)', value: 'standard' },
        { label: 'Full (+ reviews + wishlist + taxes)', value: 'full' },
      ],
      defaultValue: 'none',
      required: true,
      admin: {
        position: 'sidebar',
        description:
          'Pack inicial de ecommerce. Modificarlo no agrega features automáticamente — usá `pnpm add-feature` o editá `features` directo.',
      },
      access: {
        create: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
        update: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'features',
      type: 'json',
      defaultValue: {
        catalog: false,
        payments: false,
        shipping: false,
        coupons: false,
        reviews: false,
        wishlist: false,
        taxes: false,
        abandonedCart: false,
        subscriptions: false,
      },
      admin: {
        position: 'sidebar',
        description:
          'Flags individuales de cada feature. Para extender: `pnpm add-feature <feature> --slug=<cliente>`.',
      },
      access: {
        read: () => true,
        create: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
        update: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
      },
    },
```

- [ ] **Step 2: Regenerar tipos de Payload**

```bash
cd agencia-backend && pnpm generate:types:shimmed
```

Verificar que `agencia-backend/src/payload-types.ts` ahora incluye `ecommerceTier: 'none' | 'lite' | 'standard' | 'full'` y `features?: { ... }` en la interfaz `Tenant`.

- [ ] **Step 3: Correr typecheck para confirmar que no rompimos nada**

```bash
cd agencia-backend && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Correr los tests existentes de `tenants` para confirmar que no rompimos nada**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/
```

Expected: todos verdes. Si algún test crea tenants sin los nuevos campos requeridos, ajustar el setup (los campos tienen `defaultValue`, así que no debería pasar).

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/src/collections/Tenants.ts agencia-backend/src/payload-types.ts
git commit -m "feat(tenants): add ecommerceTier and features JSON fields"
```

---

### Task 3: Extender `TenantInput` y `buildTenantData` en `create-client.ts`

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts:22-68`

- [ ] **Step 1: Agregar import y extender el tipo**

En `create-client.ts`, agregar al inicio (después de los imports existentes):

```typescript
import {
  EcommerceTier,
  FeatureKey,
  defaultFeaturesForTier,
  isValidFeaturesObject,
} from './lib/feature-keys'
```

Y extender `TenantInput`:

```typescript
export type TenantInput = {
  name: string
  slug: string
  domain: string
  serviceType: ServiceType
  frontendType: FrontendType
  status: TenantStatus
  projectPrice?: number
  maintenanceFee?: number
  blogEnabled: boolean
  ecommerceTier: EcommerceTier
  features: Record<FeatureKey, boolean>
}
```

- [ ] **Step 2: Extender `buildTenantData`**

```typescript
export const buildTenantData = (input: TenantInput): Record<string, unknown> => {
  const data: Record<string, unknown> = {
    name: input.name,
    slug: input.slug,
    domain: input.domain,
    serviceType: input.serviceType,
    frontendType: input.frontendType,
    status: input.status,
    blogEnabled: input.blogEnabled,
    ecommerceTier: input.ecommerceTier,
    features: input.features,
  }
  if (input.projectPrice !== undefined) data.projectPrice = input.projectPrice
  if (input.maintenanceFee !== undefined) data.maintenanceFee = input.maintenanceFee
  return data
}
```

- [ ] **Step 3: Agregar un test para `buildTenantData` con los nuevos campos**

Crear (si no existe) o extender `agencia-backend/tests/int/scripts/create-client.int.spec.ts` con:

```typescript
import { buildTenantData } from '../../../scripts/create-client'
import { DEFAULT_FEATURES } from '../../../scripts/lib/feature-keys'

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
```

- [ ] **Step 4: Correr el test**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

```bash
cd agencia-backend && pnpm typecheck
```

Expected: errors en el resto del archivo porque `promptTenant` todavía no devuelve los nuevos campos. Es esperado; lo arreglamos en el Task 4. **No commitear todavía.**

- [ ] **Step 6: Commit parcial**

Si `promptTenant` quedó con type errors, **no commitear** y pasar al Task 4 que los arregla. Si `promptTenant` no tiene type errors porque todavía no se llama a los nuevos campos, sí commitear:

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): extend TenantInput with ecommerceTier and features"
```

---

### Task 4: Agregar `promptEcommerceTier` en `create-client.ts`

**Files:**
- Modify: `agencia-backend/scripts/create-client.ts:133-204`

- [ ] **Step 1: Agregar la función `promptEcommerceTier` después de `promptUser`**

```typescript
import { ECOMMERCE_TIERS, defaultFeaturesForTier } from './lib/feature-keys'

/**
 * Pregunta interactivamente el tier de ecommerce cuando serviceType === 'tienda-online'.
 * Devuelve `{ ecommerceTier, features }` listo para meter en TenantInput.
 * Si serviceType !== 'tienda-online', devuelve `{ ecommerceTier: 'none', features: DEFAULT_FEATURES }`.
 */
export const promptEcommerceTier = async (serviceType: ServiceType): Promise<{
  ecommerceTier: import('./lib/feature-keys').EcommerceTier
  features: Record<import('./lib/feature-keys').FeatureKey, boolean>
}> => {
  const { DEFAULT_FEATURES } = await import('./lib/feature-keys')

  if (serviceType !== 'tienda-online') {
    return { ecommerceTier: 'none', features: { ...DEFAULT_FEATURES } }
  }

  const tierChoice = await p.select({
    message: 'Tier inicial de ecommerce:',
    options: [
      { value: 'lite', label: 'Lite (catálogo + Stripe)' },
      { value: 'standard', label: 'Standard (+ envíos + cupones)' },
      { value: 'full', label: 'Full (+ reviews + wishlist + taxes)' },
      { value: 'custom', label: 'Custom (elijo feature por feature)' },
    ],
  })
  if (p.isCancel(tierChoice)) {
    p.cancel('Operación cancelada.')
    process.exit(0)
  }

  if (tierChoice === 'custom') {
    const features = { ...DEFAULT_FEATURES }
    for (const key of Object.keys(features) as Array<keyof typeof features>) {
      const answer = await p.confirm({
        message: `¿Prender "${key}"?`,
        initialValue: false,
      })
      if (p.isCancel(answer)) {
        p.cancel('Operación cancelada.')
        process.exit(0)
      }
      features[key] = answer === true
    }
    return { ecommerceTier: 'custom', features }
  }

  return {
    ecommerceTier: tierChoice as import('./lib/feature-keys').EcommerceTier,
    features: defaultFeaturesForTier(tierChoice as import('./lib/feature-keys').EcommerceTier),
  }
}
```

> **Nota:** `'custom'` no es parte de `ECOMMERCE_TIERS` (es un sentinel del prompt). El handler real persiste las `features` y mantiene el tier como valor sentinal para distinguirlo. Si querés tratarlo como `'full'` cuando todas las features están prendidas, agregalo en `defaultFeaturesForTier` como un caso especial. Para Sprint 0 se persiste tal cual.

- [ ] **Step 2: Agregar `'custom'` al tipo `EcommerceTier`**

Editar `agencia-backend/scripts/lib/feature-keys.ts`:

```typescript
export const ECOMMERCE_TIERS = ['none', 'lite', 'standard', 'full', 'custom'] as const
```

> **Trade-off:** agregar `'custom'` al tipo significa que los access controls del backend (que leen `ecommerceTier` para lógica condicional) deben tratarlo como "ver features individuales". Para Sprint 0, ningún access control lo lee todavía, así que es seguro. Si te complica, otra opción es NO persistir `'custom'` y mapear a `'full'` o a un sentinel aparte en `features` — pero entonces perdés la info "este cliente pidió custom".

- [ ] **Step 3: Actualizar `promptTenant` para llamar a `promptEcommerceTier`**

Localizar `promptTenant` en `create-client.ts`. Después del prompt de `blogEnabled` y antes del prompt de `status`, agregar:

```typescript
  const { ecommerceTier, features } = await promptEcommerceTier(serviceType)
```

Y agregar al objeto retornado:

```typescript
  return {
    name: String(name),
    slug,
    domain: String(domain),
    serviceType,
    frontendType,
    status,
    blogEnabled: blogEnabled === true,
    ecommerceTier,
    features,
    projectPrice: projectPriceStr ? Number(projectPriceStr) : undefined,
    maintenanceFee: maintenanceFeeStr ? Number(maintenanceFeeStr) : undefined,
  }
```

- [ ] **Step 4: Actualizar `confirmSummary` para mostrar el tier**

En `confirmSummary`, después de `blogEnabled`, agregar:

```typescript
  if (tenant.serviceType === 'tienda-online') {
    console.log(`  ecommerceTier: ${tenant.ecommerceTier}`)
    const enabled = Object.entries(tenant.features)
      .filter(([, v]) => v)
      .map(([k]) => k)
    console.log(`  features: ${enabled.length === 0 ? '(ninguna)' : enabled.join(', ')}`)
  }
```

- [ ] **Step 5: Correr typecheck**

```bash
cd agencia-backend && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Correr los tests existentes**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/create-client.int.spec.ts
```

Expected: tests existentes verdes. Si algún test mockeaba `promptTenant` y rompía por el nuevo campo, ajustar los mocks en el spec.

- [ ] **Step 7: Commit**

```bash
git add agencia-backend/scripts/create-client.ts agencia-backend/scripts/lib/feature-keys.ts agencia-backend/tests/int/scripts/create-client.int.spec.ts
git commit -m "feat(scripts): prompt ecommerce tier during client creation"
```

---

### Task 5: Crear el registry de features con stubs

**Files:**
- Create: `agencia-backend/scripts/features/_stub.ts`
- Create: `agencia-backend/scripts/features/index.ts`
- Create: `agencia-backend/scripts/features/{catalog,payments,shipping,coupons,reviews,wishlist,taxes,abandoned-cart,subscriptions}/{install.ts,uninstall.ts,README.md}`
- Create: `agencia-backend/tests/int/scripts/features/registry.int.spec.ts`

- [ ] **Step 1: Crear el stub compartido**

```typescript
// agencia-backend/scripts/features/_stub.ts
import type { FeatureInstallContext, FeatureInstallResult } from './types'

/**
 * Stub para features no implementadas todavía.
 * Solo registra la intención y devuelve OK.
 * Cuando una feature se implemente (sprint propio), reemplazar este stub
 * por código real que copie archivos, modifique .env, etc.
 */
export const installStub = async (
  feature: string,
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  ctx.log(
    `Feature "${feature}" marcada como prendida. ` +
      `Implementación real llega en un sprint futuro. Por ahora solo el flag está activo.`,
  )
  return {
    ok: true,
    copiedFiles: [],
    envKeysAdded: [],
  }
}

export const uninstallStub = async (
  feature: string,
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  ctx.log(
    `Feature "${feature}" marcada como apagada. ` +
      `No hay archivos que limpiar en el stub.`,
  )
  return {
    ok: true,
    copiedFiles: [],
    envKeysAdded: [],
  }
}
```

- [ ] **Step 2: Crear el archivo de tipos**

```typescript
// agencia-backend/scripts/features/types.ts
export type FeatureInstallContext = {
  tenantSlug: string
  destDir: string
  log: (msg: string) => void
}

export type FeatureInstallResult = {
  ok: boolean
  copiedFiles: string[]
  envKeysAdded: string[]
  error?: string
}

export type FeatureModule = {
  slug: string
  displayName: string
  description: string
  install: (ctx: FeatureInstallContext) => Promise<FeatureInstallResult>
  uninstall: (ctx: FeatureInstallContext) => Promise<FeatureInstallResult>
  envKeysRequired: string[]
  dependsOn?: string[]
}
```

- [ ] **Step 3: Crear el registry**

```typescript
// agencia-backend/scripts/features/index.ts
import type { FeatureModule } from './types'
import { installStub, uninstallStub } from './_stub'

const stubFor = (slug: string, displayName: string, description: string): FeatureModule => ({
  slug,
  displayName,
  description,
  install: (ctx) => installStub(slug, ctx),
  uninstall: (ctx) => uninstallStub(slug, ctx),
  envKeysRequired: [],
})

export const FEATURES: Record<string, FeatureModule> = {
  catalog: stubFor(
    'catalog',
    'Catálogo de productos',
    'Products, Categories, /shop, /product/[slug]',
  ),
  payments: stubFor(
    'payments',
    'Pagos con Stripe',
    'Stripe checkout, webhooks, /cart, /checkout',
  ),
  shipping: stubFor('shipping', 'Envíos', 'Zonas geográficas + métodos de envío'),
  coupons: stubFor('coupons', 'Cupones', 'Códigos de descuento'),
  reviews: stubFor('reviews', 'Reviews', 'Ratings + comentarios en productos'),
  wishlist: stubFor('wishlist', 'Wishlist', 'Lista de deseos por cliente'),
  taxes: stubFor('taxes', 'Impuestos', 'Reglas de impuesto por país/categoría'),
  abandonedCart: stubFor(
    'abandonedCart',
    'Carrito abandonado',
    'Detección + email de recuperación',
  ),
  subscriptions: stubFor(
    'subscriptions',
    'Suscripciones',
    'Productos recurrentes (Stripe Subscriptions API)',
  ),
}

export const getFeature = (slug: string): FeatureModule | undefined => FEATURES[slug]

export const listFeatureSlugs = (): string[] => Object.keys(FEATURES)
```

- [ ] **Step 4: Crear las 9 carpetas de features con archivos stub**

Por cada feature (catalog, payments, shipping, coupons, reviews, wishlist, taxes, abandoned-cart, subscriptions), crear:

`agencia-backend/scripts/features/<slug>/install.ts`:

```typescript
// Sprint 0: stub. Reemplazar por implementación real en su sprint.
export { installStub as install } from '../_stub'
```

`agencia-backend/scripts/features/<slug>/uninstall.ts`:

```typescript
// Sprint 0: stub. Reemplazar por implementación real en su sprint.
export { uninstallStub as uninstall } from '../_stub'
```

`agencia-backend/scripts/features/<slug>/README.md`:

```markdown
# Feature: <displayName>

**Slug:** `<slug>`
**Estado:** Stub (Sprint 0). Implementación real llega en su sprint propio.

## Qué va a hacer (cuando se implemente)

<TODO: completar cuando se implemente la feature>
```

> El README es un placeholder legítimo — el TODO se completa en el sprint de la feature. No es un "no hacer" del plan, es un "documentar cuando se implemente".

- [ ] **Step 5: Tests del registry**

```typescript
// agencia-backend/tests/int/scripts/features/registry.int.spec.ts
import { describe, it, expect } from 'vitest'
import { FEATURES, getFeature, listFeatureSlugs } from '../../../scripts/features'

describe('features registry', () => {
  it('exports 9 features', () => {
    expect(listFeatureSlugs()).toHaveLength(9)
  })

  it('includes all expected slugs', () => {
    const expected = [
      'catalog',
      'payments',
      'shipping',
      'coupons',
      'reviews',
      'wishlist',
      'taxes',
      'abandonedCart',
      'subscriptions',
    ]
    for (const slug of expected) {
      expect(getFeature(slug)).toBeDefined()
    }
  })

  it('every feature has slug, displayName, description, install, uninstall', () => {
    for (const [slug, mod] of Object.entries(FEATURES)) {
      expect(mod.slug).toBe(slug)
      expect(typeof mod.displayName).toBe('string')
      expect(typeof mod.description).toBe('string')
      expect(typeof mod.install).toBe('function')
      expect(typeof mod.uninstall).toBe('function')
    }
  })

  it('every feature stub installs successfully with a minimal context', async () => {
    const ctx = {
      tenantSlug: 'test',
      destDir: '/tmp/nonexistent',
      log: () => {},
    }
    for (const [, mod] of Object.entries(FEATURES)) {
      const result = await mod.install(ctx)
      expect(result.ok).toBe(true)
      expect(Array.isArray(result.copiedFiles)).toBe(true)
    }
  })

  it('every feature stub uninstalls successfully', async () => {
    const ctx = {
      tenantSlug: 'test',
      destDir: '/tmp/nonexistent',
      log: () => {},
    }
    for (const [, mod] of Object.entries(FEATURES)) {
      const result = await mod.uninstall(ctx)
      expect(result.ok).toBe(true)
    }
  })
})
```

- [ ] **Step 6: Correr los tests**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/features/registry.int.spec.ts
```

Expected: PASS — los 5 tests verdes.

- [ ] **Step 7: Commit**

```bash
git add agencia-backend/scripts/features/ agencia-backend/tests/int/scripts/features/
git commit -m "feat(scripts): add features registry with stubs for Sprint 0"
```

---

### Task 6: Implementar `add-feature.ts` — `parseArgs` y helpers de DB

**Files:**
- Create: `agencia-backend/scripts/add-feature.ts`

- [ ] **Step 1: Crear el archivo con `parseArgs` (puro) y los stubs de DB**

```typescript
// agencia-backend/scripts/add-feature.ts
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ECOMMERCE_TIERS, isValidEcommerceTier, isValidFeatureName } from './lib/feature-keys'
import { getFeature, listFeatureSlugs } from './features'
import * as p from '@clack/prompts'
import { cp } from 'node:fs/promises'

// --- Constants ---
export const MONOREPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, '../../')
export const FEATURES_DIR = path.join(MONOREPO_ROOT, 'agencia-backend/scripts/features')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

// --- Pure: arg parsing ---
export type ParsedArgs = {
  feature?: string
  slug?: string
  status: boolean
  remove: boolean
  filter?: string
}

export const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = { status: false, remove: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--status') args.status = true
    else if (arg === '--remove') args.remove = true
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length)
    else if (arg.startsWith('--filter=')) args.filter = arg.slice('--filter='.length)
    else if (!arg.startsWith('--') && !args.feature) args.feature = arg
  }
  return args
}

// --- DB helpers ---
export const getTenantBySlug = async (
  slug: string,
): Promise<{ id: number; slug: string; features: Record<string, boolean>; ecommerceTier: string } | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (result.totalDocs === 0) return null
  const doc = result.docs[0] as {
    id: number
    slug: string
    features: Record<string, boolean>
    ecommerceTier: string
  }
  return doc
}

export const setTenantFeature = async (
  tenantId: number,
  feature: string,
  value: boolean,
): Promise<void> => {
  const payload = await getPayload({ config })
  const result = await payload.findByID({ collection: 'tenants', id: tenantId })
  const features = { ...(result.features as Record<string, boolean>) }
  features[feature] = value
  await payload.update({
    collection: 'tenants',
    id: tenantId,
    data: { features },
  })
}

export const getEnabledFeatures = (features: Record<string, boolean>): string[] =>
  Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => k)

// --- Validation ---
export const validateFeatureName = (feature: unknown): string | null => {
  if (!isValidFeatureName(feature)) {
    return `Feature "${String(feature)}" no existe. Features válidas: ${listFeatureSlugs().join(', ')}`
  }
  return null
}

export const validateTenantSlug = (slug: unknown): string | null => {
  if (typeof slug !== 'string' || slug.length === 0) {
    return 'Falta --slug=<cliente>'
  }
  return null
}
```

- [ ] **Step 2: Agregar tests puros para `parseArgs`**

Extender `agencia-backend/tests/int/scripts/lib/feature-keys.int.spec.ts` o crear `tests/int/scripts/add-feature-args.int.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseArgs } from '../../../scripts/add-feature'

describe('add-feature parseArgs', () => {
  it('parses feature positional arg', () => {
    expect(parseArgs(['shipping'])).toEqual({
      feature: 'shipping',
      slug: undefined,
      status: false,
      remove: false,
      filter: undefined,
    })
  })

  it('parses --slug flag', () => {
    expect(parseArgs(['shipping', '--slug=mood'])).toMatchObject({
      feature: 'shipping',
      slug: 'mood',
    })
  })

  it('parses --status', () => {
    expect(parseArgs(['--status', '--slug=mood']).status).toBe(true)
  })

  it('parses --remove', () => {
    expect(parseArgs(['shipping', '--slug=mood', '--remove']).remove).toBe(true)
  })

  it('parses --filter', () => {
    expect(parseArgs(['--status', '--filter=ecommerce-tier:standard']).filter).toBe(
      'ecommerce-tier:standard',
    )
  })

  it('returns empty result for empty argv', () => {
    expect(parseArgs([])).toEqual({
      feature: undefined,
      slug: undefined,
      status: false,
      remove: false,
      filter: undefined,
    })
  })

  it('ignores args after the first positional', () => {
    // Only the first positional is the feature; subsequent non-flags are ignored
    expect(parseArgs(['shipping', 'extra']).feature).toBe('shipping')
  })
})
```

- [ ] **Step 3: Correr los tests**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/add-feature-args.int.spec.ts
```

Expected: PASS — los 7 tests verdes.

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/scripts/add-feature.ts agencia-backend/tests/int/scripts/add-feature-args.int.spec.ts
git commit -m "feat(scripts): add-feature arg parser and tenant DB helpers"
```

---

### Task 7: Implementar `add-feature.ts` — orquestador + handlers

**Files:**
- Modify: `agencia-backend/scripts/add-feature.ts` (extender con `run()` + handlers)

- [ ] **Step 1: Agregar los handlers de status y enable/disable**

Extender `agencia-backend/scripts/add-feature.ts` con:

```typescript
// --- Handlers ---
export const handleStatus = async (slug: string): Promise<void> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    p.log.error(`Tenant "${slug}" no existe`)
    return
  }
  console.log(`\n--- Tenant: ${tenant.slug} ---`)
  console.log(`ecommerceTier: ${tenant.ecommerceTier}`)
  const enabled = getEnabledFeatures(tenant.features)
  console.log(`features prendidas: ${enabled.length === 0 ? '(ninguna)' : enabled.join(', ')}`)
  console.log(`features apagadas:  ${listFeatureSlugs().filter((k) => !tenant.features[k]).join(', ') || '(ninguna)'}`)
  console.log('---------------------------\n')
}

export const handleEnableFeature = async (
  slug: string,
  feature: string,
): Promise<void> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    p.log.error(`Tenant "${slug}" no existe`)
    process.exit(1)
  }

  if (!isValidFeatureName(feature)) {
    throw new Error(
      `Feature "${feature}" no existe. Features válidas: ${listFeatureSlugs().join(', ')}`,
    )
  }

  const mod = getFeature(feature)!
  if (tenant.features[feature]) {
    p.log.warn(`Feature "${feature}" ya estaba prendida en "${slug}". No-op.`)
    return
  }

  // Snapshot for rollback
  const originalValue = tenant.features[feature]

  // 1. Patchear el flag
  try {
    await setTenantFeature(tenant.id, feature, true)
    p.log.success(`Tenant "${slug}": features.${feature} = true`)
  } catch (err) {
    p.log.error(`No se pudo patchear el tenant: ${(err as Error).message}`)
    throw err
  }

  // 2. Llamar al install de la feature
  const destDir = path.join(CLIENTS_DIR, slug)
  try {
    const result = await mod.install({
      tenantSlug: slug,
      destDir,
      log: (msg) => p.log.info(msg),
    })
    if (!result.ok) {
      // Rollback del flag
      await setTenantFeature(tenant.id, feature, originalValue)
      throw new Error(`Install de "${feature}" falló. Rollback del flag hecho.`)
    }
    p.log.success(
      `Feature "${feature}" prendida. ${result.copiedFiles.length} archivos copiados, ${result.envKeysAdded.length} env vars agregadas.`,
    )
  } catch (err) {
    await setTenantFeature(tenant.id, feature, originalValue)
    p.log.error(`Install de "${feature}" tiró excepción. Rollback del flag hecho.`)
    throw err
  }
}

export const handleDisableFeature = async (
  slug: string,
  feature: string,
): Promise<void> => {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    p.log.error(`Tenant "${slug}" no existe`)
    process.exit(1)
  }

  if (!isValidFeatureName(feature)) {
    throw new Error(
      `Feature "${feature}" no existe. Features válidas: ${listFeatureSlugs().join(', ')}`,
    )
  }

  if (!tenant.features[feature]) {
    p.log.warn(`Feature "${feature}" ya estaba apagada en "${slug}". No-op.`)
    return
  }

  const mod = getFeature(feature)!
  const originalValue = tenant.features[feature]

  // 1. Llamar al uninstall primero (puede borrar archivos)
  const destDir = path.join(CLIENTS_DIR, slug)
  try {
    const result = await mod.uninstall({
      tenantSlug: slug,
      destDir,
      log: (msg) => p.log.info(msg),
    })
    if (!result.ok) {
      throw new Error(`Uninstall de "${feature}" falló. Flag NO modificado.`)
    }
  } catch (err) {
    p.log.error(`Uninstall de "${feature}" tiró excepción. Flag NO modificado.`)
    throw err
  }

  // 2. Patchear el flag
  try {
    await setTenantFeature(tenant.id, feature, false)
    p.log.success(`Tenant "${slug}": features.${feature} = false`)
    p.log.success(`Feature "${feature}" apagada.`)
  } catch (err) {
    await setTenantFeature(tenant.id, feature, originalValue)
    p.log.error(`No se pudo patchear el flag. Rollback hecho.`)
    throw err
  }
}
```

- [ ] **Step 2: Agregar el orquestador `run()`**

```typescript
// --- Orchestrator ---
export const run = async (argv: string[]): Promise<void> => {
  const args = parseArgs(argv)

  // --status solo necesita --slug
  if (args.status) {
    if (args.filter) {
      // Bulk status: filtrar tenants por algún criterio
      p.log.warn(`--filter con --status no implementado todavía (Sprint futuro).`)
      return
    }
    const slugError = validateTenantSlug(args.slug)
    if (slugError) {
      p.log.error(slugError)
      process.exit(1)
    }
    await handleStatus(args.slug!)
    return
  }

  // Enable/disable necesitan feature + slug
  const featureError = validateFeatureName(args.feature)
  if (featureError) {
    p.log.error(featureError)
    process.exit(1)
  }
  const slugError = validateTenantSlug(args.slug)
  if (slugError) {
    p.log.error(slugError)
    process.exit(1)
  }

  if (args.remove) {
    await handleDisableFeature(args.slug!, args.feature!)
  } else {
    await handleEnableFeature(args.slug!, args.feature!)
  }
}

// Auto-invoke solo cuando se ejecuta como script principal
// (no cuando se importa desde tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2)
  run(argv).catch((err) => {
    p.log.error((err as Error).message)
    process.exit(1)
  })
}
```

- [ ] **Step 3: Agregar test de integración end-to-end**

```typescript
// agencia-backend/tests/int/scripts/add-feature.int.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { handleEnableFeature, handleDisableFeature, handleStatus, getTenantBySlug } from '../../../scripts/add-feature'
import { DEFAULT_FEATURES } from '../../../scripts/lib/feature-keys'

let testTenantId: number

beforeEach(async () => {
  const payload = await getPayload({ config })
  const slug = `test-${Date.now()}`
  const created = await payload.create({
    collection: 'tenants',
    data: {
      name: `Test ${slug}`,
      slug,
      domain: `${slug}.test`,
      serviceType: 'tienda-online',
      frontendType: 'nextjs',
      status: 'pending',
      ecommerceTier: 'none',
      features: { ...DEFAULT_FEATURES },
      blogEnabled: false,
    },
  })
  testTenantId = created.id as number
})

describe('add-feature enable/disable/status', () => {
  const resolveSlug = async (): Promise<string> => {
    const payload = await getPayload({ config })
    const tenants = await payload.find({
      collection: 'tenants',
      where: { id: { equals: testTenantId } },
      limit: 1,
    })
    return (tenants.docs[0] as { slug: string }).slug
  }

  it('enables a feature on a tenant', async () => {
    const slug = await resolveSlug()
    await handleEnableFeature(slug, 'catalog')
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.catalog).toBe(true)
  })

  it('is idempotent: enabling twice does not throw', async () => {
    const slug = await resolveSlug()
    await handleEnableFeature(slug, 'catalog')
    await expect(handleEnableFeature(slug, 'catalog')).resolves.toBeUndefined()
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.catalog).toBe(true)
  })

  it('disables a feature', async () => {
    const slug = await resolveSlug()
    await handleEnableFeature(slug, 'catalog')
    await handleDisableFeature(slug, 'catalog')
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.catalog).toBe(false)
  })

  it('disable is idempotent: disabling twice does not throw', async () => {
    const slug = await resolveSlug()
    await expect(handleDisableFeature(slug, 'shipping')).resolves.toBeUndefined()
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.shipping).toBe(false)
  })

  it('throws on non-existent tenant', async () => {
    await expect(handleEnableFeature('does-not-exist', 'catalog')).rejects.toThrow()
  })

  it('throws on invalid feature name', async () => {
    const slug = await resolveSlug()
    await expect(handleEnableFeature(slug, 'bogus')).rejects.toThrow()
  })

  it('status does not modify anything', async () => {
    const slug = await resolveSlug()
    const before = await getTenantBySlug(slug)
    await handleStatus(slug)
    const after = await getTenantBySlug(slug)
    expect(after?.features).toEqual(before?.features)
  })
})
```

- [ ] **Step 4: Correr los tests**

```bash
cd agencia-backend && pnpm test:int -- --run tests/int/scripts/add-feature.int.spec.ts
```

Expected: PASS — los 7 tests verdes. Los handlers tiran `throw` (no `process.exit`) en los errores, así que `rejects.toThrow()` funciona limpio.

- [ ] **Step 5: Typecheck**

```bash
cd agencia-backend && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add agencia-backend/scripts/add-feature.ts agencia-backend/tests/int/scripts/add-feature.int.spec.ts
git commit -m "feat(scripts): add-feature orchestrator with enable/disable/status"
```

---

### Task 8: Agregar npm script `add-feature`

**Files:**
- Modify: `agencia-backend/package.json`

- [ ] **Step 1: Agregar la línea del script**

Localizar la línea `"backfill:blog-enabled"` en `package.json` y agregar después:

```json
"add-feature": "node scripts/loaders/run-with-css.mjs scripts/add-feature.ts",
```

- [ ] **Step 2: Verificar que corre (sin argumentos debería fallar con mensaje claro)**

```bash
cd agencia-backend && pnpm add-feature
```

Expected: error "Falta feature" o "Feature no existe" con la lista de features válidas. Exit code ≠ 0.

- [ ] **Step 3: Verificar `--help`-like (status con --status)**

```bash
cd agencia-backend && pnpm add-feature --status --slug=mood 2>&1 | head -20
```

Expected: muestra el tier y features de `mood`, exit code 0.

Si `mood` no existe en tu DB local, no es problema — `--status` con un slug que no existe va a tirar `Tenant "mood" no existe` y exit code ≠ 0. Eso valida que el error path funciona.

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/package.json
git commit -m "chore(scripts): add add-feature npm script"
```

---

### Task 9: Verificación end-to-end con un cliente real

**Files:** ninguno (smoke test manual)

- [ ] **Step 1: Crear un cliente de prueba**

```bash
cd agencia-backend && pnpm create-client
```

Seguir los prompts. Cuando pregunte `Tipo de servicio:`, elegir `Tienda Online`. Cuando pregunte el tier, elegir `Lite`. El resto como te parezca. Al final confirma con `y`.

- [ ] **Step 2: Verificar en el admin de Payload que el tenant tiene los campos nuevos**

Levantar el backend (`pnpm dev`), ir al admin, abrir el tenant recién creado. Verificar:
- `ecommerceTier` = `lite` en sidebar
- `features` = JSON con `catalog: true, payments: true, resto false`

- [ ] **Step 3: Probar `add-feature` con el slug del cliente**

```bash
cd agencia-backend && pnpm add-feature shipping --slug=<slug-del-cliente>
```

Expected: success, `features.shipping = true`, mensaje "Feature shipping prendida. 0 archivos copiados, 0 env vars agregadas."

- [ ] **Step 4: Verificar que el flag quedó prendido**

Refrescar el admin. `features.shipping` debería estar `true`.

- [ ] **Step 5: Probar `--remove`**

```bash
cd agencia-backend && pnpm add-feature shipping --slug=<slug-del-cliente> --remove
```

Expected: success, `features.shipping = false`.

- [ ] **Step 6: Verificar idempotencia**

```bash
cd agencia-backend && pnpm add-feature catalog --slug=<slug>  # ya está prendido de Lite
```

Expected: warn "ya estaba prendida. No-op." — sin error.

- [ ] **Step 7: Limpiar (opcional)**

Si querés borrar el cliente de prueba: hacerlo desde el admin. Si querés dejar todo limpio para empezar Sprint 1, listo.

- [ ] **Step 8: Commit final si hay ajustes**

Si algún test manual reveló ajustes menores (typos, mensajes de error más claros), commitear con un mensaje descriptivo. Si todo anduvo limpio, no hace falta commit.

---

## Self-Review (lo corro yo después de escribir, no es un task)

1. **Spec coverage:**
   - §3.3 (cambios en Tenants) → Task 2
   - §3.4 (cambios en create-client) → Tasks 3-4
   - §3.5 (script add-feature) → Tasks 6-7
   - §3.6 (carpeta features/) → Task 5
   - `ecommerceTier` y `features` con sus defaults → Task 2
   - Idempotencia de `add-feature` → Task 7 test "enabling twice does not throw"
   - `--status`, `--remove` → Task 7 handlers
   - Multi-tenant + access controls → Task 2 access config en campos
   - Tests int → Tasks 1, 5, 6, 7

2. **Placeholder scan:** Solo dos TODOs legítimos (los READMEs por feature), documentados como tales. Nada más.

3. **Type consistency:** `EcommerceTier`, `FeatureKey`, `ParsedArgs`, `FeatureModule` se mantienen consistentes entre tasks. `FeatureInstallContext`/`FeatureInstallResult` están bien definidos y usados.

4. **Scope:** Sprint 0 produce "cliente ecommerce vacío configurable" — working, testable software. Cumple.

5. **Posibles gaps:**
   - El bulk enable (`--filter`) queda como hook (no implementado). Documentado en §3 de diseño original. Si el usuario lo pide, sale en un sprint siguiente sin afectar este plan.
   - El plan usa imports relativos (`../../../scripts/...`) en tests para coincidir con el patrón existente en `tests/int/scripts/create-client.int.spec.ts`. El alias `@/*` en `tsconfig.json` apunta solo a `src/*`.

---

## Cómo se ejecuta

**Opción A — Subagent-Driven (recomendado):** un sub-agente fresco por task, con review entre tasks. Más control, más iteración.

**Opción B — Inline:** ejecutar los tasks en esta misma sesión en batches con checkpoints.

Cuando termines, los siguientes planes a escribir son:
- **Sprint 1**: catalog (Products, Categories, /shop, /product/[slug], bloques). Reemplaza el `install.ts` stub de catalog.
- **Sprint 2**: payments (Stripe + checkout).
- etc.
