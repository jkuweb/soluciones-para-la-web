# Diseño: Script `create-client.ts` para Bootstrap de Clientes

**Fecha:** 2026-06-17
**Autor:** Joseba
**Estado:** Aprobado
**Referencia:** Reemplaza `bootstrap-cliente.sh` (obsoleto)

---

## 1. Propósito

Definir un script interactivo en TypeScript que cree un nuevo cliente (**tenant** + **user**) en el backend Payload CMS y haga el bootstrap del frontend clonando el template correspondiente (Astro o Next.js) en una ruta de proyectos, generando el `.env` con el `TENANT_SLUG` configurado.

Reemplaza al script bash `bootstrap-cliente.sh` que tiene las mismas responsabilidades pero con menos robustez: sin validaciones, sin rollback, parseo de JSON frágil con `sed`, sin interactividad, y paths hardcoded distintos al destino acordado.

---

## 2. Contexto

El backend Payload CMS es multi-tenant. Cada cliente es un documento en la colección `Tenants` con un `slug` único. Los frontends son proyectos separados que consultan Payload filtrando por `TENANT_SLUG` configurado en su `.env`.

Los templates viven en la raíz del monorepo:

- `astro-starter/` — para `serviceType: web-estatica` con `frontendType: astro`
- `nextjs-starter/` — para `serviceType: tienda-online | academia-online` con `frontendType: nextjs`

El destino de los proyectos frontend es `/home/joseba/Clientes/clientes/<slug>/`.

---

## 3. Diseño

### 3.1 Ubicación y archivos afectados

- **Crear:** `agencia-backend/scripts/create-client.ts`
- **Eliminar:** `bootstrap-cliente.sh` (queda obsoleto al migrar a TS).
- **Crear test:** `agencia-backend/tests/int/scripts/create-client.int.spec.ts`

### 3.2 Dependencias nuevas

- `@clack/prompts` — librería de prompts interactivos con validación en vivo, spinner y output limpio. Estándar moderno en el ecosistema Node.

Sin más dependencias. Se usa `getPayload` (ya disponible vía `@payloadcms/next`), `node:fs/promises` para la copia de archivos, y `node:path` para rutas.

### 3.3 Rutas (constantes en el archivo)

```ts
const MONOREPO_ROOT = path.resolve(__dirname, '../../')  // /home/joseba/Clientes/agencia
const TEMPLATES_DIR = MONOREPO_ROOT                       // busca <type>-starter/ adentro
const CLIENTS_DIR = '/home/joseba/Clientes/clientes'
```

### 3.4 Estructura interna

```
run() — orquestador
 ├─ promptTenant()        → valida unicidad de slug contra la DB
 ├─ promptUser()          → valida unicidad de email contra la DB
 ├─ confirmSummary()      → muestra todo y pide y/n
 ├─ execute()
 │   ├─ payload.create({ collection: 'tenants', ... })
 │   ├─ payload.create({ collection: 'users', ... }) con tenants: [tenantId]
 │   ├─ copyTemplate(frontendType, slug)  → CLIENTS_DIR/<slug>/
 │   └─ generateEnv(destDir, slug)
 └─ printSuccess(...)
```

### 3.5 Flujo de ejecución

**Fase 1 — Prompts del tenant:**

- `name` — texto, requerido.
- `slug` — texto, regex `^[a-z0-9-]+$`, valida que no exista en DB. Re-prompt si está tomado.
- `domain` — texto, requerido.
- `serviceType` — select: `web-estatica` | `tienda-online` | `academia-online`.
- `frontendType` — select: `astro` | `nextjs`.
- `status` — select, default `pending`: `pending` | `active` | `suspended`.
- `projectPrice` — número, opcional (Enter para skip).
- `maintenanceFee` — número, opcional (Enter para skip).

**Fase 2 — Prompts del user:**

- `email` — texto, valida formato y que no exista en DB. Re-prompt si está tomado.
- `name` — texto, requerido.
- `password` — password con confirmación, re-prompt si no matchea, mínimo 8 caracteres.
- `role` — select, default `tenant-admin`: `tenant-admin` | `tenant-editor`.

**Fase 3 — Confirmación:** muestra resumen completo, pregunta "Create? (y/n)".

**Fase 4 — Ejecución:**

1. `payload.create({ collection: 'tenants', data: { ... } })` con los datos del prompt.
2. `payload.create({ collection: 'users', data: { email, name, password, roles: [role], tenants: [tenant.id] } })` — el campo `tenants` es el array que gestiona el plugin multi-tenant.
3. `copyTemplate(frontendType, slug)` — copia `<TEMPLATES_DIR>/<frontendType>-starter/` a `CLIENTS_DIR/<slug>/` con `fs.cp` recursivo.
4. `generateEnv(destDir, slug)` — lee `<destDir>/.env.example`, reemplaza el placeholder del slug y escribe `<destDir>/.env`.

**Fase 5 — Output:** imprime resumen con credenciales y próximos pasos.

### 3.6 Manejo de errores y rollback

1. **Falla `tenants.create`** → abortar, no tocar nada. Mostrar el error de Payload.
2. **Falla `users.create`** → borrar el tenant creado (`payload.delete({ collection: 'tenants', id })`), abortar.
3. **Falla `copyTemplate` o `generateEnv`** → tenant y user quedan en DB (no se hace rollback de DB). Advertir con instrucciones claras para completar manualmente:
   - "DB OK, pero la copia del template falló. Reintentá con: `cp -r <TEMPLATES_DIR>/<type>-starter <CLIENTS_DIR>/<slug>`"

Las validaciones de unicidad (slug, email) se hacen ANTES de tocar la DB, re-prompt si el valor ya existe.

### 3.7 Output esperado

```
========================================
  Cliente creado!
========================================
  Tenant:     cliente-ejemplo
  User:       admin@cliente-ejemplo.com / <password tipeado>
  Frontend:   /home/joseba/Clientes/clientes/cliente-ejemplo/
  Próximos pasos:
    1. Crear las páginas en el admin de Payload
    2. cd /home/joseba/Clientes/clientes/cliente-ejemplo
    3. pnpm install
    4. Editar src/styles/theme.css con los colores del cliente
    5. pnpm dev
========================================
```

---

## 4. Testing

`agencia-backend/tests/int/scripts/create-client.int.spec.ts` con Vitest:

- Mockear `@clack/prompts` con respuestas prefijadas (factory que devuelve `{ name: 'Test', slug: 'test', ... }`).
- Usa la DB de tests del proyecto (mismo setup que el resto de tests int).
- Cubre los casos:
  - Happy path: todos los datos se crean y los archivos se copian.
  - Slug duplicado: el script re-prompt antes de tocar la DB.
  - Email duplicado: idem.
  - Falla al crear user: el tenant creado se borra (rollback).
  - Falla al copiar template: tenant+user quedan, pero el output lo aclara.
- Asserts:
  - `payload.findByID({ collection: 'tenants', id })` retorna el tenant correcto.
  - `payload.findByID({ collection: 'users', id })` retorna el user con `tenants[0].tenant === tenant.id`.
  - Los archivos del template existen en `CLIENTS_DIR/<slug>/`.
  - `<destDir>/.env` contiene `TENANT_SLUG=<slug>`.

---

## 5. Decisiones tomadas

| Decisión | Justificación |
|----------|---------------|
| **TypeScript en lugar de bash** | Mejor manejo de errores tipados, tests viables con vitest, `getPayload` da acceso directo a la DB sin parsear respuestas REST con `sed`. |
| **`@clack/prompts`** | UX moderna, validación en vivo, estándar en el ecosistema Node, no requiere configurar nada. |
| **No crear páginas seed** | El super-admin crea las páginas desde el admin de Payload. El template las renderiza automáticamente vía el filtro por `TENANT_SLUG`. |
| **Destino por slug, no por dominio** | El slug es la clave estable de Payload. El dominio puede cambiar sin afectar la identidad del tenant. |
| **`CLIENTS_DIR` hardcoded** | La ruta `/home/joseba/Clientes/clientes` es la convención del proyecto. Si cambia, se cambia en una sola constante. |
| **Eliminar `bootstrap-cliente.sh`** | El nuevo script lo reemplaza con más robustez. Mantener ambos generaría confusión sobre cuál usar. |
| **Templates por path relativo a `__dirname`** | Los templates viven en la raíz del monorepo y el script vive en `agencia-backend/scripts/`. Dos niveles arriba desde el script es la raíz. Cero configuración. |

---

## 6. Próximos pasos

1. Implementar el script siguiendo este diseño.
2. Tests de integración según sección 4.
3. Borrar `bootstrap-cliente.sh`.
4. Correr el script con un cliente de prueba para validar el flujo end-to-end (crear tenant+user+clonar+levantar `pnpm dev` y verificar que el template consulta el tenant correcto).
5. Documentar el uso del script en el README del backend si hace falta.

---

**Documento aprobado por:** Joseba
**Fecha de aprobación:** 2026-06-17
