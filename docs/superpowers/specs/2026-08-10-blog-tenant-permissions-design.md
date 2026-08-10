# Diseño: Permisos de Blog por Tenant (`blogEnabled`)

**Fecha:** 2026-08-10
**Autor:** Joseba
**Estado:** Pendiente de aprobación
**Referencia:** Corrige la lógica actual donde solo `super-admin` puede crear/eliminar Posts, Categories y Tags. La data ya está aislada por tenant (plugin multi-tenant), falta la autorización de escritura.

---

## 1. Propósito

Mover la creación y gestión del blog (posts, categorías, tags) del super-admin a cada cliente, gateado por un toggle `blogEnabled` en el tenant. El super-admin decide qué clientes tienen blog; los clientes que sí lo tienen gestionan su propio contenido desde su admin.

### Comportamiento objetivo

| Actor | `blogEnabled: true` en su tenant | `blogEnabled: false` en su tenant |
|---|---|---|
| `super-admin` | CRUD en cualquier tenant | CRUD en cualquier tenant |
| `tenant-admin` / `tenant-editor` del tenant | CRUD completo de posts/categories/tags del tenant | No ve "Blog" en la nav, 403 por URL directa, API pública devuelve lista vacía |
| Sin usuario (API pública) | Ve posts publicados del tenant | No ve nada del tenant |

---

## 2. Contexto

El backend es Payload CMS 3.85.1 con `@payloadcms/plugin-multi-tenant`. Hoy:

- `Tenants` no tiene ningún flag para activar features.
- `Posts`, `Categories`, `Tags` están registradas en el plugin (`plugins/index.ts:7-16`) → el campo `tenant` se inyecta y la data se filtra automáticamente.
- El access control de las tres collections de blog está mal:
  - `read: authenticatedOrPublished` o `tenantAccess()` (filtra por tenant del user).
  - `create: only super-admin`.
  - `update: tenantAccess()`.
  - `delete: only super-admin`.

Resultado: el tenant-admin/editor entra al admin, ve la nav de Blog, pero no puede crear ni borrar nada. El super-admin termina siendo quien crea el contenido de todos los clientes, lo cual no escala.

Hay data existente de prueba (posts/categories/tags) que ya tiene `tenant` asignado por el plugin, así que no hay huérfanos. Lo único que rompe al meter el toggle es que `blogEnabled` va a default `false` y los clientes con contenido existente van a perder el acceso hasta que se active manualmente o se corra el backfill.

---

## 3. Diseño

### 3.1 Campo nuevo en `Tenants`

Modificar `agencia-backend/src/collections/Tenants.ts`. Agregar un campo al final del array `fields`:

```ts
{
  name: 'blogEnabled',
  type: 'checkbox',
  label: 'Blog activado',
  defaultValue: false,
  admin: {
    description:
      'Permite al cliente crear y gestionar sus posts, categorías y etiquetas. Si está desactivado, el cliente no ve la sección de blog en su admin y la API pública devuelve lista vacía para este tenant.',
    position: 'sidebar',
  },
  access: {
    // Solo super-admin puede togglear este flag
    update: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
  },
}
```

**Por qué:**
- `defaultValue: false` → clientes nuevos arrancan sin blog; el super-admin lo activa a pedido.
- `position: 'sidebar'` → visible de un vistazo en la pantalla de edición del tenant.
- `access.update` → el cliente no puede auto-activarse aunque sepa la URL.
- El campo es `read`-able por cualquier user autenticado (necesario para que el admin del cliente lo vea, aunque sea solo lectura).

### 3.2 Helper de access nuevo: `blogEnabledAccess`

Crear `agencia-backend/src/access/blogEnabledAccess.ts` con tres exports.

**Por qué tres funciones:** cada una cubre una semántica distinta. `blogEnabledPostRead` maneja el caso público de Posts (sin user, solo published). `blogEnabledTenant` es el caso general autenticado: filtra a los tenants del user que tengan `blogEnabled=true` y se usa para todo lo demás. `blogEnabledAdminHidden` es un boolean para esconder la nav, no un where.

```ts
import type { Access } from 'payload'

/**
 * Acceso tenant-scoped con filtro de blogEnabled.
 *
 * Usado para:
 *   - Categories.read (no es público, solo tenant users)
 *   - Tags.read (idem)
 *   - Posts / Categories / Tags: create, update, delete
 *
 * - super-admin: true
 * - tenant user: solo permitido en sus tenants con blogEnabled=true
 * - sin user: false
 *
 * El where clause se matchea contra el data submitted (create) o
 * el doc existente (update/delete). El plugin multi-tenant auto-rellena
 * el campo `tenant` en create con el del user.
 *
 * Lookup async de cada tenant para ser robusto a `user.tenants` con
 * depth 0 (algunos contextos de request no lo populan).
 */
export const blogEnabledTenant: Access = async ({ req: { user, payload } }) => {
  if (!user) return false
  if (user.roles?.includes('super-admin')) return true

  const tenantRefs = user.tenants || []
  if (tenantRefs.length === 0) return false

  const allowedTenantIds: (string | number)[] = []
  for (const t of tenantRefs) {
    const tenantId =
      typeof t.tenant === 'object' && t.tenant !== null
        ? (t.tenant as { id: string | number }).id
        : (t.tenant as string | number)
    if (tenantId == null) continue

    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })

    if (tenant?.blogEnabled) {
      allowedTenantIds.push(tenantId)
    }
  }

  if (allowedTenantIds.length === 0) return false
  return { tenant: { in: allowedTenantIds } }
}

/**
 * Read access para Posts (la única collection del blog que es pública).
 *
 * - super-admin: true
 * - tenant user: sus tenants con blogEnabled=true (cualquier status)
 * - sin user: solo published de tenants con blogEnabled=true
 *
 * Para el caso público, el where combina `_status: published` con
 * `tenant.blogEnabled: true`. Payload traduce esto a JOIN sobre tenants.
 */
export const blogEnabledPostRead: Access = async ({ req: { user, payload } }) => {
  if (user?.roles?.includes('super-admin')) return true

  if (!user) {
    return {
      and: [
        { _status: { equals: 'published' } },
        { 'tenant.blogEnabled': { equals: true } },
      ],
    }
  }

  // Caso autenticado: misma lógica que blogEnabledTenant
  return blogEnabledTenant({ req: { user, payload } })
}

/**
 * Predicate para `admin.hidden` de las collections de blog.
 *
 * - super-admin: nunca oculta (false)
 * - tenant user: oculta si NINGUNO de sus tenants tiene blogEnabled=true
 * - sin user: oculta
 *
 * Se usa como `admin.hidden: blogEnabledAdminHidden` en cada collection.
 */
export const blogEnabledAdminHidden: Access = async ({ req: { user, payload } }) => {
  if (!user) return true
  if (user.roles?.includes('super-admin')) return false

  const tenantRefs = user.tenants || []
  for (const t of tenantRefs) {
    const tenantId =
      typeof t.tenant === 'object' && t.tenant !== null
        ? (t.tenant as { id: string | number }).id
        : (t.tenant as string | number)
    if (tenantId == null) continue

    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })

    if (tenant?.blogEnabled) return false
  }

  return true
}
```

**Por qué `blogEnabledPostRead` y no un único `blogEnabledRead` para las tres collections:** Posts es la única del blog que tiene un caso público (posts publicados sin auth). Categories y Tags siguen siendo privadas (solo accesible a tenant users autenticados). Mezclar los dos casos en una sola función obligaría a categories/tags a volverse públicos, lo cual cambia la privacidad actual sin necesidad. Mantener dos funciones preserva el modelo existente y solo agrega el filtro de `blogEnabled`.

### 3.3 Aplicar a Posts, Categories, Tags

En cada uno de los tres archivos, reemplazar el bloque `access` y agregar `admin.hidden`. **Importante:** Posts usa `blogEnabledPostRead` (maneja el caso público), Categories y Tags usan `blogEnabledTenant` (solo autenticado, preserva la privacidad actual).

```ts
// Posts.ts
import {
  blogEnabledPostRead,
  blogEnabledTenant,
  blogEnabledAdminHidden,
} from '@/access/blogEnabledAccess'

// dentro de CollectionConfig
access: {
  read: blogEnabledPostRead,
  create: blogEnabledTenant,
  update: blogEnabledTenant,
  delete: blogEnabledTenant,
},
admin: {
  ...existingAdminConfig,
  hidden: blogEnabledAdminHidden,
}
```

```ts
// Categories.ts y Tags.ts (mismo código para los dos)
import {
  blogEnabledTenant,
  blogEnabledAdminHidden,
} from '@/access/blogEnabledAccess'

// dentro de CollectionConfig
access: {
  read: blogEnabledTenant,
  create: blogEnabledTenant,
  update: blogEnabledTenant,
  delete: blogEnabledTenant,
},
admin: {
  ...existingAdminConfig,
  hidden: blogEnabledAdminHidden,
}
```

Archivos a modificar:
- `agencia-backend/src/collections/Posts/Posts.ts` → usa `blogEnabledPostRead` en read
- `agencia-backend/src/collections/Categories/Categories.ts` → usa `blogEnabledTenant` en read
- `agencia-backend/src/collections/Tags/Tags.ts` → usa `blogEnabledTenant` en read

**Nota sobre el endpoint custom `/preview-post` en `Posts.ts`:** ese handler usa `overrideAccess: true` y un where con `tenant.slug`, así que sigue funcionando para que el super-admin previsualice drafts desde el admin. No necesita cambios en este PR. Si en el futuro queremos que el preview respete `blogEnabled`, se agrega el filtro dentro del handler — fuera de scope acá.

### 3.4 Comportamiento de la API pública

**Posts (única collection del blog que es pública):**

| Estado | `blogEnabled: true` | `blogEnabled: false` |
|---|---|---|
| Sin auth | Ve posts publicados del tenant | Lista vacía (o 404 en single) |
| `tenant-admin`/`tenant-editor` del tenant | Ve todos los posts (cualquier status) | Lista vacía |
| `super-admin` | Ve todo | Ve todo |

**Categories y Tags (privadas, solo tenant users autenticados):**

| Estado | `blogEnabled: true` | `blogEnabled: false` |
|---|---|---|
| Sin auth | 403 (no son públicas) | 403 |
| `tenant-admin`/`tenant-editor` del tenant | Ve sus categorías/tags | Lista vacía (forbidden por blogEnabled) |
| `super-admin` | Ve todo | Ve todo |

**Implicancia para el frontend:** el starter Astro/Next consume `GET /api/posts` para listar y detalle de posts. Cuando `blogEnabled: false`, el endpoint devuelve lista vacía y el starter ya hace 404 — no hay que tocar el cliente. Categorías y tags no se exponen en el frontend público, así que el cambio no las afecta.

**Privacidad preservada:** la única collection del blog que pasa de "público con filtro de status" a "público con filtro de status + blogEnabled" es Posts. Categories y Tags siguen siendo privadas (solo tenant users autenticados), comportamiento que ya estaba.

### 3.5 Script de backfill para data existente

Como `blogEnabled` default es `false`, los tenants con contenido existente (posts/categories/tags ya creados) van a perder acceso al blog hasta que se active manualmente. Solución: un script idempotente que active el flag para cualquier tenant que tenga contenido de blog.

Crear `agencia-backend/scripts/backfill-blog-enabled.ts`:

```ts
/**
 * Backfill: activa `blogEnabled: true` en cualquier tenant que tenga
 * al menos 1 post, 1 category o 1 tag.
 *
 * Idempotente: correrlo dos veces da el mismo resultado.
 *
 * Uso:
 *   pnpm tsx agencia-backend/scripts/backfill-blog-enabled.ts
 *   pnpm tsx agencia-backend/scripts/backfill-blog-enabled.ts --dry-run
 */
```

Lógica:
1. `payload.find({ collection: 'tenants', limit: 0, pagination: false })` → lista de todos los tenants.
2. Para cada tenant:
   - Contar posts con `tenant.id == tenantId`.
   - Contar categories con `tenant.id == tenantId`.
   - Contar tags con `tenant.id == tenantId`.
   - Si cualquier contador > 0 y `blogEnabled !== true` → update.
3. En `--dry-run`, loggear qué tenants se activarían sin escribir.
4. Resumen al final: tenants actualizados, ya activos, sin contenido.

Agregar script npm en `agencia-backend/package.json`:
```json
"scripts": {
  "backfill:blog-enabled": "tsx scripts/backfill-blog-enabled.ts"
}
```

---

## 4. Testing

### `agencia-backend/tests/int/blog-permissions.int.spec.ts`

Tests de integración con Vitest, usando la DB de tests del proyecto. Cubre:

**Access — super-admin:**
- Puede `create`, `update`, `delete` posts/categories/tags en un tenant con `blogEnabled: false`.
- `read` retorna todos los posts (cualquier status, cualquier tenant).

**Access — tenant-admin con `blogEnabled: true`:**
- Puede `create` un post en su tenant.
- Puede `update` y `delete` posts de su tenant.
- `read` retorna posts publicados y drafts de su tenant.
- No puede `update` ni `delete` posts de OTRO tenant (debería dar 403 o no encontrar el doc).

**Access — tenant-admin con `blogEnabled: false`:**
- `create` → 403.
- `update` de un post existente → 403.
- `delete` de un post existente → 403.
- `read` → lista vacía (no retorna posts de su tenant, ni siquiera publicados).

**API pública (sin auth):**
- `GET /api/posts?where[tenant.slug][equals]=<slug-with-blog>` → retorna solo posts publicados del tenant.
- `GET /api/posts?where[tenant.slug][equals]=<slug-without-blog>` → lista vacía.

**`admin.hidden`:**
- Para `super-admin` → `false` (siempre visible).
- Para `tenant-admin` de tenant con `blogEnabled: true` → `false` (visible).
- Para `tenant-admin` de tenant con `blogEnabled: false` → `true` (oculto).

**Backfill script:**
- Tenant sin contenido → no se toca.
- Tenant con 1 post → se activa `blogEnabled: true`.
- Tenant ya con `blogEnabled: true` → no se toca.
- `--dry-run` no escribe nada en DB.

### Helpers de test necesarios

- `createTestUser(payload, { roles: ['tenant-admin'], tenants: [tenantId] })` — si no existe ya.
- `createTestTenant(payload, { blogEnabled: true | false })`.
- `createTestPost(payload, { tenant: tenantId })` con cleanup en `afterEach`.

Reusar los helpers de `tests/int/` que ya existan para crear tenants/users, o crear nuevos en `tests/int/helpers/` si hace falta.

---

## 5. Decisiones tomadas

| Decisión | Justificación |
|----------|---------------|
| **Toggle en `Tenants` (no en colección aparte, no en `serviceType`)** | Una sola fuente de verdad, sin infraestructura nueva. `serviceType` representa el tipo de servicio vendido (web estática, tienda, academia), no features individuales. Si en el futuro hay muchas features (e-commerce, academy, etc.) se puede migrar a `TenantFeatures` sin perder data. |
| **Default `false` en `blogEnabled`** | SaaS mindset: el super-admin activa features a pedido, no al revés. Reduce superficie de error para clientes nuevos. |
| **Solo `super-admin` puede togglear `blogEnabled`** | El campo define qué features tiene cada cliente. Esa decisión es de producto y la toma el admin, no el cliente. |
| **`tenant-admin` Y `tenant-editor` pueden escribir blog** | Coherente con el patrón existente: ambos roles tienen las mismas capacidades de contenido en `Pages` y `Media`. Restringir a solo `tenant-admin` agregaría fricción sin valor. |
| **API pública también gateada por `blogEnabled`** | Fuente única de verdad: si el blog está apagado, no existe — ni en admin ni en público. El cliente que quiera preservar SEO de posts viejos simplemente no apaga el flag (o se hace redirect 301 a otra sección). |
| **`admin.hidden` con función async (DB lookup)** | El `user.tenants` puede venir con depth 0 en algunos contextos (ej. requests de auth). El lookup async garantiza que el check funciona siempre, sin depender de la profundidad de población. |
| **Backfill script, no auto-migración en `push: true`** | `push: true` solo crea/actualiza schema. Los valores por default de campos nuevos no se pueden controlar desde schema. Un script explícito es más trazable y permite dry-run. |
| **Helper unificado `blogEnabledAccess.ts` con 3 exports** | Las tres funciones comparten la lógica de "resolver tenants del user y checkear blogEnabled". Tenerlas juntas facilita cambios futuros (ej. agregar un nuevo predicate). |
| **Dos read functions separadas (`blogEnabledPostRead` y `blogEnabledTenant`) en lugar de una sola** | Posts es la única collection del blog con caso público (sin user, ver published). Categories y Tags siguen siendo privadas (solo tenant users). Una sola función de read obligaría a volver públicas las categories/tags, lo cual cambia la privacidad sin necesidad. Mantener dos preserva el modelo actual y solo agrega el filtro de `blogEnabled`. |
| **No tocar el endpoint `/preview-post`** | Usa `overrideAccess: true` y requiere `PREVIEW_SECRET` (admin-only). No es un vector de leak. Cambiarlo agrega complejidad sin ganancia. |
| **Helper en `src/access/` con sufijo `Access`** | Sigue la convención existente del proyecto: `tenantAccess.ts`, `authenticatedOrPublished.ts`, `superAdminOnly.ts`. |

---

## 6. Próximos pasos

1. Implementar el helper `agencia-backend/src/access/blogEnabledAccess.ts`.
2. Agregar `blogEnabled` a `Tenants.ts`.
3. Modificar `Posts.ts`, `Categories.ts`, `Tags.ts` para usar el nuevo helper.
4. Crear el script `agencia-backend/scripts/backfill-blog-enabled.ts` + npm script.
5. Correr el backfill (con `--dry-run` primero) sobre la DB de desarrollo.
6. Crear `tests/int/blog-permissions.int.spec.ts` con la cobertura de la sección 4.
7. Correr `pnpm test` y `pnpm typecheck` y `pnpm lint`. Limpiar lo que rompa.
8. Verificación end-to-end manual:
   - Crear un tenant con `blogEnabled: true`, asignar un `tenant-admin`, crear un post, verlo en la nav, publicarlo, verificar que aparece en `/api/posts` público.
   - Crear otro tenant con `blogEnabled: false`, asignar un `tenant-admin`, verificar que la nav no muestra Blog, que `GET /api/posts?where[tenant.slug]=...` devuelve lista vacía.
9. Commit con conventional commits: un commit por archivo lógico (`feat(tenants): add blogEnabled flag`, `feat(blog): per-tenant write access`, etc).
10. PR contra `main` con la descripción de los pasos de verificación.

---

**Documento aprobado por:** (pendiente)
**Fecha de aprobación:** (pendiente)
