# Diseño: `welcome-banner` — Feature demo end-to-end para `add-feature`

**Fecha:** 2026-08-21
**Autor:** Joseba
**Estado:** Aprobado (sección por sección en sesión)
**Sprint:** ecommerce-kit Sprint 0.5 (entre Sprint 0 —infra— y Sprint 1 —catalog real—)
**Complementa:** `2026-08-20-ecommerce-kit-design.md` (sistema modular)

---

## 1. Propósito

Implementar la **primera feature real** del sistema `add-feature` para validar el pipeline install + env vars + rollback antes de invertir semanas en `catalog` (Sprint 1). El demo:

- Copia un componente Next.js al proyecto del cliente.
- Agrega una env var a `.env.example`.
- Se puede apagar (uninstall) y deja el filesystem limpio.
- Si el install falla a mitad, el flag de DB se rollea a `false`.

Es un demo pequeño, deliberadamente: el valor es **probar el contrato** que tiene que cumplir cada `install.ts` / `uninstall.ts` futuros.

---

## 2. Contexto

- `agencia-backend/scripts/features/` tiene 9 features registradas en `index.ts` (`catalog`, `payments`, `shipping`, `coupons`, `reviews`, `wishlist`, `taxes`, `abandonedCart`, `subscriptions`). **Todas son stubs** (`_stub.ts`): setean el flag en DB pero `copiedFiles: []`, `envKeysAdded: []`.
- El Sprint 0 entregó infraestructura pero **ningún feature visible**. Cualquier feature nueva hoy no hace nada perceptible para el cliente.
- El flujo de `add-feature` corre: `setTenantFeature` → `mod.install()` → log success. Si `mod.install` falla, hay rollback del flag en `handleEnableFeature` (no testeado).
- En el `nextjs-starter/`, los bloques de storefront se renderizan via `BlockRenderer.tsx` con un mapa estático `{ slug: Component }`. Agregar un bloque nuevo requiere editar ese mapa a mano (no hay auto-discovery).

---

## 3. Diseño

### 3.1 Arquitectura

Se agregan estas piezas:

1. **Payload block `welcomeBanner`** — vive en `agencia-backend/src/blocks/WelcomeBanner.ts`. Pre-registrado en `payload.config.ts` igual que `HeroBlock` / `TextBlock`. Disponible para todas las páginas de cualquier tenant.

2. **Componente Next.js `WelcomeBanner.tsx`** — plantilla en `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`. El install lo copia a `destDir/src/components/blocks/WelcomeBanner.tsx`.

3. **Módulo feature `welcome-banner`** — vive en `agencia-backend/scripts/features/welcome-banner/`. Tiene `install.ts`, `uninstall.ts`, `README.md`. Se registra en `scripts/features/index.ts`.

4. **Tests** — unit (install/uninstall con tmp dirs) + integración (extender `add-feature.int.spec.ts` con happy path + rollback) + e2e (extender `add-feature-exit.int.spec.ts`).

Lo que **no** cambia:
- `add-feature.ts` (orchestrator).
- `run-with-css.mjs` (loader).
- Schema del `Tenant` (ya tiene `features: Record<FeatureKey, boolean>`).

### 3.2 Componentes

**Block Payload** (`agencia-backend/src/blocks/WelcomeBanner.ts`):

```ts
export const WelcomeBannerBlock: Block = {
  slug: 'welcomeBanner',
  fields: [
    { name: 'text', type: 'text', required: false },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
  ],
}
```

Se agrega al array `blocks` en `payload.config.ts`.

**Componente Next.js** (plantilla en `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`):

```tsx
import type { WelcomeBanner as WelcomeBannerType } from '@/payload-types'

export function WelcomeBanner({ block }: { block: WelcomeBannerType }) {
  if (!block.enabled) return null
  const text = block.text || process.env.WELCOME_BANNER_TEXT || '¡Bienvenido!'
  return <div className="welcome-banner">{text}</div>
}
```

Resolución: `block.text` (admin) → `WELCOME_BANNER_TEXT` (env) → default literal.

**install.ts** (`agencia-backend/scripts/features/welcome-banner/install.ts`):

- Resuelve `MONOREPO_ROOT` (mismo patrón que `add-feature.ts`) para encontrar la plantilla en `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`.
- Copia el archivo a `destDir/src/components/blocks/WelcomeBanner.tsx`.
- Lee `destDir/.env.example` (lo crea si no existe). Appendea `WELCOME_BANNER_TEXT=` al final del archivo, solo si la línea no existe.
- Retorna `{ ok: true, copiedFiles: ['src/components/blocks/WelcomeBanner.tsx'], envKeysAdded: ['WELCOME_BANNER_TEXT'] }`.

**uninstall.ts** (espejo de install):

- Borra `destDir/src/components/blocks/WelcomeBanner.tsx` si existe (no falla si no está).
- Remueve la línea `WELCOME_BANNER_TEXT=` de `destDir/.env.example` si existe.
- **No** toca `.env` ni `.env.local`.
- Retorna `{ ok: true, copiedFiles: [], envKeysAdded: [] }`.

**README.md** del feature:

- Qué hace (banner configurable por tenant con env var de fallback).
- Qué archivos copia / qué env vars agrega.
- **Post-install manual**: agregar `import { WelcomeBanner }` y registrarlo en el mapa de `BlockRenderer.tsx`.

**Registro en `scripts/features/index.ts`**:

```ts
import { install as welcomeBannerInstall } from './welcome-banner/install'
import { uninstall as welcomeBannerUninstall } from './welcome-banner/uninstall'

welcomeBanner: {
  slug: 'welcomeBanner',
  displayName: 'Banner de bienvenida',
  description: 'Banner configurable por tenant con env var de fallback',
  install: welcomeBannerInstall,
  uninstall: welcomeBannerUninstall,
  envKeysRequired: ['WELCOME_BANNER_TEXT'],
},
```

Y agregar `'welcomeBanner'` a `FEATURE_KEYS` en `lib/feature-keys.ts`.

**Contratos**:

- `install.ts` y `uninstall.ts` cumplen el tipo `FeatureModule` (ya existe en `features/types.ts`).
- Ambos son idempotentes.

### 3.3 Data flow

**Install (happy path)**:

```
pnpm add-feature welcome-banner --slug=acme
  │
  ├─ loader: parse args, exit si faltan
  ├─ handleEnableFeature(slug, 'welcomeBanner')
  │   ├─ getTenantBySlug → tenant
  │   ├─ validate: feature name ok, slug ok
  │   ├─ snapshot original value (false)
  │   ├─ ① setTenantFeature(id, 'welcomeBanner', true)   ← flag prendido
  │   ├─ ② mod.install({ destDir, log })
  │   │     ├─ copy template → destDir/src/components/blocks/WelcomeBanner.tsx
  │   │     ├─ append WELCOME_BANNER_TEXT= → destDir/.env.example
  │   │     └─ return { ok: true, copiedFiles, envKeysAdded }
  │   └─ log success
  └─ loader: process.exit(0)
```

**Install (rollback)**:

```
handleEnableFeature(slug, 'welcomeBanner')
  ├─ ① setTenantFeature(id, 'welcomeBanner', true)
  ├─ ② mod.install() throws / returns { ok: false }
  ├─ catch: setTenantFeature(id, 'welcomeBanner', originalValue)   ← rollback
  ├─ throw
  └─ loader: process.exit(1)
```

**Uninstall (happy path)**:

```
pnpm add-feature welcome-banner --slug=acme --remove
  │
  ├─ handleDisableFeature(slug, 'welcomeBanner')
  │   ├─ ① mod.uninstall({ destDir, log })
  │   │     ├─ delete destDir/src/components/blocks/WelcomeBanner.tsx (si existe)
  │   │     ├─ remove WELCOME_BANNER_TEXT= de .env.example (si existe)
  │   │     └─ return { ok: true }
  │   ├─ ② setTenantFeature(id, 'welcomeBanner', false)
  │   └─ log success
  └─ loader: process.exit(0)
```

**Orden en uninstall**: archivos primero, flag después. Si uninstall falla, flag se queda en `true` (consistente con que los archivos existen). Si uninstall pasa y el flag falla, rollback del flag a `true`.

**Post-install manual del cliente** (no lo hace el script):

1. Editar `BlockRenderer.tsx` → agregar `import { WelcomeBanner }` y `'welcomeBanner': WelcomeBanner` al mapa.
2. Setear `WELCOME_BANNER_TEXT=Bienvenido a Acme` en `.env`.
3. En Payload admin → agregar block `welcomeBanner` a una página con texto custom.

**Idempotencia**:

- Install: si flag ya está en `true`, no-op. Si la línea `WELCOME_BANNER_TEXT=` ya existe en `.env.example`, no duplica.
- Uninstall: si flag ya está en `false`, no-op. Si el archivo no existe, no falla. Si la env var no está, no falla.

### 3.4 Error handling

**install.ts**:

| Escenario | Comportamiento | Rollback |
|---|---|---|
| `destDir` no existe | `return { ok: false, error }` | flag restaurado a `originalValue` |
| Template source no existe | `return { ok: false, error }` | flag restaurado a `originalValue` |
| Error copiando componente | `return { ok: false, error }` | flag restaurado a `originalValue` |
| `.env.example` no existe | Crearlo (`mkdir -p` + write) | — |
| Error appendeando env var | Borrar componente copiado (cleanup interno), `return { ok: false }` | flag restaurado a `originalValue` |

**uninstall.ts** (todo idempotente, sin rollback necesario):

| Escenario | Comportamiento |
|---|---|
| Componente no existe | Skip (no falla) |
| `.env.example` no existe | Skip |
| Línea `WELCOME_BANNER_TEXT=` no está | Skip |
| Error de I/O inesperado | `return { ok: false, error }` — flag queda en `true` |

**Limitación conocida** (documentada en README del feature):

Si install copia el componente PERO falla appendeando la env var, intentamos borrar el componente antes de retornar error. Si ese cleanup también falla, queda el archivo como orphan. **El uninstall posterior limpia todo**, así que el estado se reconcilia en el siguiente ciclo.

**Logging**:

Cada paso via `ctx.log(msg)`. Ejemplo éxito:

```
✓ Copied src/components/blocks/WelcomeBanner.tsx
✓ Appended WELCOME_BANNER_TEXT= to .env.example
```

Ejemplo error:

```
✗ Failed to copy template: ENOENT no such file nextjs-starter/src/components/blocks/WelcomeBanner.tsx
```

**Lo que el script NO hace** (límites explícitos):

- No toca `.env` ni `.env.local` (solo `.env.example`).
- No reinicia el dev server del cliente.
- No edita `BlockRenderer.tsx` automáticamente (post-install manual documentado).

### 3.5 Testing

**Unit tests** (nuevo, `tests/unit/features/welcome-banner-install.spec.ts` y `welcome-banner-uninstall.spec.ts`):

```
install:
  ✓ copies component file to destDir/src/components/blocks/
  ✓ appends WELCOME_BANNER_TEXT= line to .env.example
  ✓ does not duplicate env var line if already present
  ✓ returns ok:false if destDir does not exist
  ✓ returns ok:false if template source is missing
  ✓ cleans up copied component if env append fails

uninstall:
  ✓ deletes component file
  ✓ removes WELCOME_BANNER_TEXT= line from .env.example
  ✓ no-ops gracefully if component file missing
  ✓ no-ops gracefully if .env.example missing
  ✓ no-ops gracefully if env var line not present
```

**Integration tests** (extender `tests/int/scripts/add-feature.int.spec.ts`):

```
add-feature enable/disable/status:
  ✓ enables welcome-banner on a tenant
  ✓ is idempotent: enabling twice does not throw
  ✓ disables welcome-banner (cleans up files + env var)
  ✓ disable is idempotent
```

**Rollback test** (clave — justifica el demo):

```
add-feature rollback:
  ✓ when install throws, flag is rolled back to false
  ✓ when install returns ok:false, flag is rolled back to false
  ✓ orphan files cleaned up if previous install left state

Setup: usar slug que NO tenga proyecto en CLIENTS_DIR (ej: 'no-such-tenant')
       → install falla porque destDir no existe
       → assert tenant.features.welcomeBanner === false después
```

**End-to-end** (extender `tests/int/scripts/add-feature-exit.int.spec.ts`):

```
exit behavior:
  ✓ --status welcome-banner exits with code 0
  ✓ enable welcome-banner exits with code 0
  ✓ disable welcome-banner exits with code 0 (--remove)
```

**Cobertura objetivo**: ≥80% en `install.ts` y `uninstall.ts`.

**Setup para unit tests**: vitest con `tmp` package para dirs temporales reales (más confianza que `vi.mock('node:fs')`).

**Lo que NO testeamos en este demo** (out of scope, queda para Sprint 1+):

- Render real del componente en storefront (e2e browser).
- Bloque aparece en Payload admin con el shape esperado (eso lo verifica el typecheck).
- Tenant isolation (ya está cubierto por la config del plugin).

---

## 4. Non-goals

- **Auto-discovery en BlockRenderer**: el wiring manual queda como paso post-install documentado. Pasar a auto-discovery es decisión para Sprint futuro (afecta a otros bloques del template).
- **Per-tenant feature gating en Payload admin**: el block `welcomeBanner` queda visible para todos los tenants (igual que HeroBlock hoy). El flag `tenant.features.welcomeBanner` afecta solo el frontend, no la disponibilidad del block en admin.
- **Soporte para Astro**: este demo solo cubre Next.js. Astro es estático y un banner de bienvenida no es prioritario ahí. Si después se necesita, es un `install.ts` adicional para el template `astro-starter/`.
- **Implementación real de catalog, payments, etc.**: este demo valida el pipeline. La implementación real de cada feature es su propio sprint.

---

## 5. Decisiones tomadas en sesión

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Block pre-registrado en Payload (global) | Per-tenant feature gating | Más simple, sigue el patrón de HeroBlock/TextBlock. Demo no necesita gating real. |
| Frontend: solo Next.js | También Astro | Astro no es prioritario para ecommerce. El demo se enfoca donde el pipeline importa. |
| Env var: `WELCOME_BANNER_TEXT` como default | Sin env var / toggle | Ejercita el camino de `envKeysAdded` del pipeline. Default text es el caso realista. |
| Rollback test incluido | Diferido a Sprint 1 | El demo existe para probar el pipeline. Sin rollback test, probás solo la mitad. |
| Approach A (manual wiring post-install) | Auto-discovery / per-tenant gating | Cambio mínimo al template. Manual wiring queda claro y documentado. Si después queremos install mágico, lo mejoramos en sprint futuro. |

---

## 6. Referencias

- `docs/superpowers/specs/2026-08-20-ecommerce-kit-design.md` — sistema modular (Sprint 0)
- `agencia-backend/scripts/features/index.ts` — registro de features
- `agencia-backend/scripts/features/_stub.ts` — stubs actuales
- `agencia-backend/scripts/features/types.ts` — `FeatureModule` y tipos
- `agencia-backend/scripts/add-feature.ts` — orchestrator (incluye rollback logic)
- `agencia-backend/scripts/lib/feature-keys.ts` — `FEATURE_KEYS` y `ECOMMERCE_TIERS`
