# Diseño: Comandos Bulk `sync:clients` y `update:clients`

**Fecha:** 2026-06-18
**Autor:** Joseba
**Estado:** Aprobado
**Referencia:** Extiende `sync:client` (singular) y `update:client` (singular)

---

## 1. Propósito

Agregar dos comandos nuevos que apliquen los cambios del template a **todos los clientes** del workspace en una sola corrida, sin necesidad de iterar manualmente con `--slug` uno por uno.

Hoy, cuando hay que actualizar todos los clientes después de un cambio en `astro-starter/` o `nextjs-starter/`, hay que correr:

```bash
pnpm sync:client --slug=cliente-a
pnpm sync:client --slug=cliente-b
pnpm sync:client --slug=cliente-c
# ... repetir para cada cliente
```

Esto es tedioso, propenso a olvidos, y no escala cuando el número de clientes crece. Los comandos bulk resuelven ese caso de uso.

---

## 2. Contexto

El backend Payload CMS es multi-tenant. Cada cliente es un directorio en `/home/joseba/Clientes/clientes/<slug>/` clonado desde un template (`astro-starter/` o `nextjs-starter/`).

Ya existen los siguientes scripts en `agencia-backend/scripts/`:

- `sync-template.ts` — sync de archivos del allowlist, singular (`--slug=X`)
- `update-deps.ts` — merge de `package.json` + sync de `.template-version.json`, singular
- `audit-clients.ts` — ya hace batch sobre todos los clientes (plural, lo tomamos como referencia)
- `create-client.ts` — bootstrap interactivo de un cliente nuevo

Falta el equivalente plural de `sync-template.ts` y `update-deps.ts`.

---

## 3. Diseño

### 3.1 Archivos

**Crear:**

- `agencia-backend/scripts/sync-clients.ts` — bulk sync orchestrator
- `agencia-backend/scripts/update-clients.ts` — bulk update orchestrator
- `agencia-backend/tests/int/scripts/sync-clients.int.spec.ts`
- `agencia-backend/tests/int/scripts/update-clients.int.spec.ts`

**Modificar:**

- `agencia-backend/package.json` — agregar 2 scripts npm

**Reutilizar (cero cambios):**

- `syncTemplate()` de `sync-template.ts` (ya soporta `apply`, `verbose`, `template`, `clientDirOverride`)
- `mergePackageJson()`, `readPackageJson()`, `runPnpmInstall()` de `update-deps.ts`
- `listClientSlugs()` de `audit-clients.ts` (filtra por regex + existencia de directorio)
- `readTemplateVersion()` de `lib/template-version.ts`

### 3.2 CLI

```bash
pnpm sync:clients [--apply] [--filter=outdated] [--template=astro|nextjs]
pnpm update:clients [--apply] [--filter=outdated] [--template=astro|nextjs] [--skip-install]
```

| Flag | Default | Significado |
|------|---------|-------------|
| `--apply` | `false` | Ejecuta los cambios. Sin el flag → dry-run. |
| `--filter=outdated` | `all` | Si `outdated`, skip clientes sin cambios (0 changed + 0 added). |
| `--template=X` | auto-detect | Override del auto-detect por `package.json#name`. |
| `--skip-install` | `false` | Solo `update:clients`. No corre `pnpm install` al final. |

### 3.3 Output

**Por cliente (durante el procesamiento):**

```
[sync] educarsano (astro) — 3 changed, 1 added, 0 skipped
[update] educarsano (astro) — 2 deps added, 0 deps kept
  + dependencies.payload@^3.85.0
```

Si `--verbose` se pasa en el futuro, se podría loguear el diff línea por línea (reutilizar `makeVerboseDiff()`). **No en esta iteración.**

**Tabla resumen al final:**

```
Client         Template  Files  Status
educarsano     astro     3c+1a  updated
imv            nextjs    0c+0a  skipped (up-to-date)
borrar2        astro     —      error: package.json missing
----------
Total: 3 | Updated: 1 | Skipped: 1 | Errors: 1
```

### 3.4 Flujo de ejecución

```
parseArgs()
  ↓
listClientSlugs(CLIENTS_DIR) → slugs
  ↓
for each slug:
  try:
    syncTemplate() / updateClient()
    if filter=outdated && (changed+added == 0): count as skipped
    else: count as updated
  catch (err):
    count as error, save message
  ↓
printSummary()
  ↓
exit(0) si no hubo errores, exit(1) si alguno falló
```

### 3.5 Manejo de errores

- **Por cliente:** try/catch alrededor de cada uno. Un cliente roto no frena el batch.
- **Detección de "outdated":** `changed > 0 || added > 0 || (en update) pkgChanges.added.length + pkgChanges.updated.length > 0`.
- **Aggregación:** un array de `{ slug, status: 'updated' | 'skipped' | 'error', reason? }`.
- **Exit code:** 0 si todos `updated` o `skipped`. 1 si algún `error`.
- **Errores de red/DB en `pnpm install`:** se loguean como error del cliente, exit 1, no se hace rollback (cada cliente es independiente).

### 3.6 Filtro `--filter=outdated`

- Aplica después de computar los cambios (post-dry-run en dry-run mode, post-sync en apply mode).
- En dry-run: si el cliente no tiene cambios, no se muestra detalle (solo la línea "skipped" en el resumen).
- En apply: si el cliente no tiene cambios, no se hace `cp` ni se crea `.bak-<ts>`. El `pnpm install` tampoco corre (en `update:clients`).
- Default `all` → procesa todos, incluso los que no tienen cambios.

---

## 4. Testing

### `sync-clients.int.spec.ts`

Cubre:

- `parseArgs` con cada flag y combinaciones.
- `runSyncAll()` (función pura, devuelve `SyncAllResult`):
  - Lista 0 clientes → exit 0, mensaje "No clients found".
  - Lista N clientes, todos up-to-date, sin filter → todos "skipped", exit 0.
  - Lista N clientes, algunos out-of-date, con `--filter=outdated` → solo se procesan los outdated.
  - Un cliente con `package.json` corrupto → cae en `error`, los demás se procesan, exit 1.
- `formatSyncAllSummary()`:
  - Formato de tabla correcto con header, divider, filas, línea de totales.
  - Status `error` muestra la razón.

Usa `mkdtempSync` para crear `CLIENTS_DIR` falso y `listClientSlugs` con override.

### `update-clients.int.spec.ts`

Idem, más:

- Verifica que `pnpm install` solo corre en apply mode y cuando hay cambios reales.
- Verifica que `--skip-install` se respeta incluso con cambios.
- Verifica que `.template-version.json` se actualiza solo en apply mode y solo para clientes con cambios.

---

## 5. Decisiones tomadas

| Decisión | Justificación |
|----------|---------------|
| **Dos scripts separados, no uno con `--mode`** | Mantiene consistencia con el patrón singular/plural existente (`sync:client` / `audit:clients`). Cada script tiene un solo propósito. |
| **Reutilizar `syncTemplate()` y `mergePackageJson()`** | Cero duplicación de lógica. Los scripts bulk son orquestadores finos. Si la lógica de sync cambia, cambia en un solo lugar. |
| **Reutilizar `listClientSlugs()` de `audit-clients.ts`** | Ya filtra por regex + existencia. Validación centralizada. |
| **`--filter=outdated` en lugar de `--all`/`--slug=X`** | El nombre describe el comportamiento. "outdated" es lo que el usuario quiere ver. `--slug=X` ya existe en el singular. |
| **Sin prompt de confirmación intermedio** | El dry-run es la review. Agregar prompt rompe el flujo para CI/scripts. El usuario decide correr con `--apply` después de leer el dry-run. |
| **Exit code != 0 si hay errores** | Permite que CI o wrappers detecten fallos. El output sigue siendo legible. |
| **No tocar `sync-template.ts` ni `update-deps.ts`** | Mantener SRP. Los scripts singulares siguen siendo single-purpose. |
| **No implementar `--verbose` en bulk** | El dry-run ya muestra suficiente. Si hace falta, se agrega en una iteración futura reutilizando `makeVerboseDiff()`. |
| **Constantes de path exportadas desde los archivos singulares** | `CLIENTS_DIR` y `TEMPLATES_DIR` ya están exportados. Reutilizamos, no duplicamos. |

---

## 6. Próximos pasos

1. Implementar `sync-clients.ts` + tests.
2. Implementar `update-clients.ts` + tests.
3. Agregar scripts npm en `package.json`.
4. Correr `pnpm sync:clients` (dry-run) sobre los clientes reales del workspace para validar el output.
5. Correr `pnpm update:clients --apply` con un cliente de prueba y verificar que se generan los `.bak-<ts>` correctamente.
6. Actualizar `AGENTS.md` con la nueva sección "Bulk operations" referenciando los comandos nuevos.
7. Commit con conventional commits: `feat(scripts): add bulk sync:clients and update:clients commands`.

---

**Documento aprobado por:** Joseba
**Fecha de aprobación:** 2026-06-18
