# Welcome-Banner Demo Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la primera feature real (`welcome-banner`) del sistema `add-feature` para validar el pipeline install + env vars + rollback antes de Sprint 1 (catalog).

**Architecture:** Payload block pre-registrado en `Pages.ts` (Content tab) + componente Next.js en `nextjs-starter/src/components/blocks/` que el install copia al cliente + módulo feature (`install.ts` / `uninstall.ts`) registrado en `features/index.ts`. Tests con TDD: unit (con `fs.mkdtemp`), integration (rollback con slug que no existe), e2e (exit code).

**Tech Stack:** Payload CMS 3.85.1, TypeScript strict, Vitest, Node.js `fs/promises`, `path.resolve` con `MONOREPO_ROOT`.

**Spec:** `docs/superpowers/specs/2026-08-21-welcome-banner-demo-design.md` (referencia obligatoria).

**Monorepo layout** (importante para paths):
```
agencia/                          ← MONOREPO_ROOT
├── agencia-backend/              ← Payload + scripts
│   ├── src/blocks/               ← Backend blocks
│   ├── src/collections/Pages.ts  ← REGISTRA los blocks en el tab Content
│   └── scripts/features/         ← Feature modules (install/uninstall)
└── nextjs-starter/               ← Template Next.js
    └── src/components/blocks/    ← Frontend renderers (plantillas)
```

`MONOREPO_ROOT` ya está exportado en `agencia-backend/scripts/add-feature.ts:10`:
```ts
export const MONOREPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, '../../')
```

---

## File Structure

**Crear**:
- `agencia-backend/src/blocks/WelcomeBanner.ts` — Payload block config
- `agencia-backend/scripts/features/welcome-banner/install.ts` — install logic
- `agencia-backend/scripts/features/welcome-banner/uninstall.ts` — uninstall logic
- `agencia-backend/scripts/features/welcome-banner/README.md` — feature docs
- `nextjs-starter/src/components/blocks/WelcomeBanner.tsx` — Next.js component template
- `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts` — install unit tests
- `agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts` — uninstall unit tests

**Modificar**:
- `agencia-backend/scripts/lib/feature-keys.ts` — agregar `'welcomeBanner'` a `FEATURE_KEYS` y `DEFAULT_FEATURES`
- `agencia-backend/src/collections/Pages.ts` — importar `WelcomeBanner` y agregarlo al array `blocks` del tab "Content"
- `agencia-backend/scripts/features/index.ts` — reemplazar el stub de `welcomeBanner` por la implementación real
- `agencia-backend/tests/int/scripts/add-feature.int.spec.ts` — agregar integration tests (happy path + rollback)
- `agencia-backend/tests/int/scripts/add-feature-exit.int.spec.ts` — agregar e2e tests (exit code)

---

## Task 1: Add `'welcomeBanner'` to FEATURE_KEYS

**Files:**
- Modify: `agencia-backend/scripts/lib/feature-keys.ts`

- [ ] **Step 1: Add the slug to FEATURE_KEYS array**

Edit `agencia-backend/scripts/lib/feature-keys.ts`. In the `FEATURE_KEYS` array (lines 4-14), add `'welcomeBanner'` as a new entry:

```ts
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
  'welcomeBanner',
] as const
```

- [ ] **Step 2: Add the default false in DEFAULT_FEATURES**

In the `DEFAULT_FEATURES` object (lines 33-43), add:

```ts
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
  welcomeBanner: false,
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd agencia-backend && pnpm typecheck`
Expected: PASS (no errors related to feature-keys.ts).

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/scripts/lib/feature-keys.ts
git commit -m "feat(features): register welcomeBanner feature key"
```

---

## Task 2: Create the Payload block `WelcomeBanner`

**Files:**
- Create: `agencia-backend/src/blocks/WelcomeBanner.ts`

- [ ] **Step 1: Create the block file**

Write `agencia-backend/src/blocks/WelcomeBanner.ts`:

```ts
import type { Block } from 'payload'

export const WelcomeBannerBlock: Block = {
  slug: 'welcomeBanner',
  labels: {
    singular: 'Welcome Banner',
    plural: 'Welcome Banners',
  },
  fields: [
    {
      name: 'text',
      type: 'text',
      required: false,
      admin: {
        description: 'Texto del banner. Si está vacío, usa WELCOME_BANNER_TEXT.',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Switch on/off del banner.',
      },
    },
  ],
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd agencia-backend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add agencia-backend/src/blocks/WelcomeBanner.ts
git commit -m "feat(blocks): add WelcomeBanner block config"
```

---

## Task 3: Register WelcomeBanner in Pages collection (Content tab)

**Files:**
- Modify: `agencia-backend/src/collections/Pages.ts`

- [ ] **Step 1: Import the block**

At the top of `agencia-backend/src/collections/Pages.ts`, add the import alphabetically with the other block imports:

```ts
import { WelcomeBannerBlock as WelcomeBanner } from '@/blocks/WelcomeBanner'
```

- [ ] **Step 2: Add to Content tab blocks array**

Find the "Content" tab (around line 265). In the `blocks: [...]` array, add `WelcomeBanner` alphabetically:

```ts
              blocks: [
                TextBlock,
                ImageBlock,
                ContactBlock,
                MenuBlock,
                WelcomeBanner,
                ProductBlock,
                CartBlock,
                CourseBlock,
              ],
```

- [ ] **Step 3: Verify typecheck**

Run: `cd agencia-backend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Regenerate Payload types**

Run: `cd agencia-backend && pnpm payload generate:types`
Expected: regenerates `src/payload-types.ts` with the `WelcomeBanner` type added.

- [ ] **Step 5: Verify the block appears in admin (optional, manual)**

Run: `cd agencia-backend && pnpm dev` (background). Visit a page in admin, open "Content" tab. The "Welcome Banner" block should appear in the "Add Block" menu.

If you don't want to verify manually, skip this step.

- [ ] **Step 6: Commit**

```bash
git add agencia-backend/src/collections/Pages.ts
git commit -m "feat(pages): register WelcomeBanner in Content tab"
```

---

## Task 4: Create the Next.js component template

**Files:**
- Create: `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`

- [ ] **Step 1: Create the component file**

Write `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`:

```tsx
import type { WelcomeBanner } from '@/payload-types'

export default function WelcomeBannerBlock({ data }: { data: WelcomeBanner }) {
  if (!data.enabled) return null
  const text = data.text || process.env.WELCOME_BANNER_TEXT || '¡Bienvenido!'
  return (
    <div className="welcome-banner" data-testid="welcome-banner">
      {text}
    </div>
  )
}
```

Note: this file does NOT have tests (it's a template, copied to client projects). Its behavior is exercised through the integration tests in Task 14.

- [ ] **Step 2: Commit**

```bash
git add nextjs-starter/src/components/blocks/WelcomeBanner.tsx
git commit -m "feat(starter): add WelcomeBanner component template"
```

---

## Task 5: install.ts — copy component file (TDD)

**Files:**
- Create: `agencia-backend/scripts/features/welcome-banner/install.ts`
- Create: `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`

- [ ] **Step 1: Set up the test file structure**

Write `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { install } from '../../../scripts/features/welcome-banner/install'

let workDir: string
let templateRoot: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'welcome-banner-test-'))
  // Create a fake template root with the component
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
  it('copies the component file to destDir/src/components/blocks/', async () => {
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
  }, { timeout: 10000 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: FAIL with "Cannot find module '../../../scripts/features/welcome-banner/install'" or similar.

- [ ] **Step 3: Implement minimal install.ts**

Create `agencia-backend/scripts/features/welcome-banner/install.ts`:

```ts
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const TEMPLATE_PATH = join(
  process.cwd(),
  '..',
  'nextjs-starter',
  'src',
  'components',
  'blocks',
  'WelcomeBanner.tsx',
)

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'

export const install = async (
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  const dest = join(ctx.destDir, COMPONENT_RELATIVE)
  await mkdir(dirname(dest), { recursive: true })
  await copyFile(TEMPLATE_PATH, dest)
  ctx.log(`✓ Copied ${COMPONENT_RELATIVE}`)
  return {
    ok: true,
    copiedFiles: [COMPONENT_RELATIVE],
    envKeysAdded: [],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/install.ts agencia-backend/tests/unit/features/welcome-banner-install.spec.ts
git commit -m "feat(welcome-banner): install copies component file"
```

---

## Task 6: install.ts — append env var to .env.example (TDD)

**Files:**
- Modify: `agencia-backend/scripts/features/welcome-banner/install.ts`
- Modify: `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`

- [ ] **Step 1: Add failing test for env var append**

Append to the `describe` block in `welcome-banner-install.spec.ts`:

```ts
  it('appends WELCOME_BANNER_TEXT= to .env.example', async () => {
    await writeFile(join(workDir, '.env.example'), 'OTHER_VAR=foo\n', 'utf-8')
    await install({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    const envContent = await readFile(join(workDir, '.env.example'), 'utf-8')
    expect(envContent).toContain('OTHER_VAR=foo')
    expect(envContent).toContain('WELCOME_BANNER_TEXT=')
  }, { timeout: 10000 })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: FAIL (the test reads .env.example but install doesn't write to it yet).

- [ ] **Step 3: Implement env var append in install.ts**

Modify `agencia-backend/scripts/features/welcome-banner/install.ts`. Replace the file content with:

```ts
import { appendFile, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const TEMPLATE_PATH = join(
  process.cwd(),
  '..',
  'nextjs-starter',
  'src',
  'components',
  'blocks',
  'WelcomeBanner.tsx',
)

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'
const ENV_EXAMPLE = '.env.example'
const ENV_KEY = 'WELCOME_BANNER_TEXT'

export const install = async (
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  const dest = join(ctx.destDir, COMPONENT_RELATIVE)
  await mkdir(dirname(dest), { recursive: true })
  await copyFile(TEMPLATE_PATH, dest)
  ctx.log(`✓ Copied ${COMPONENT_RELATIVE}`)

  // Append env var to .env.example (create if missing)
  const envPath = join(ctx.destDir, ENV_EXAMPLE)
  let existing = ''
  try {
    existing = await (await import('node:fs/promises')).readFile(envPath, 'utf-8')
  } catch {
    // file does not exist — will create
  }
  if (!existing.includes(`${ENV_KEY}=`)) {
    await writeFile(envPath, existing ? `${existing}${ENV_KEY}=\n` : `${ENV_KEY}=\n`, 'utf-8')
    ctx.log(`✓ Appended ${ENV_KEY}= to ${ENV_EXAMPLE}`)
  }

  return {
    ok: true,
    copiedFiles: [COMPONENT_RELATIVE],
    envKeysAdded: [ENV_KEY],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/install.ts agencia-backend/tests/unit/features/welcome-banner-install.spec.ts
git commit -m "feat(welcome-banner): install appends WELCOME_BANNER_TEXT to .env.example"
```

---

## Task 7: install.ts — idempotency for env var (TDD)

**Files:**
- Modify: `agencia-backend/scripts/features/welcome-banner/install.ts`
- Modify: `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`

- [ ] **Step 1: Add failing test for idempotency**

Append to the describe block:

```ts
  it('does not duplicate WELCOME_BANNER_TEXT if already present', async () => {
    await writeFile(join(workDir, '.env.example'), 'WELCOME_BANNER_TEXT=hello\n', 'utf-8')
    await install({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    const envContent = await readFile(join(workDir, '.env.example'), 'utf-8')
    const occurrences = envContent.split('WELCOME_BANNER_TEXT=').length - 1
    expect(occurrences).toBe(1)
    expect(envContent).toContain('WELCOME_BANNER_TEXT=hello')
  }, { timeout: 10000 })
```

- [ ] **Step 2: Run test to verify it passes (already idempotent from Task 6)**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: PASS (the `if (!existing.includes(...))` check in Task 6 already handles this).

If it fails, fix the implementation. Otherwise:

- [ ] **Step 3: Commit**

```bash
git add agencia-backend/tests/unit/features/welcome-banner-install.spec.ts
git commit -m "test(welcome-banner): cover env var idempotency"
```

---

## Task 8: install.ts — return ok:false when destDir missing (TDD)

**Files:**
- Modify: `agencia-backend/scripts/features/welcome-banner/install.ts`
- Modify: `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`

- [ ] **Step 1: Add failing test**

Append to the describe block:

```ts
  it('returns ok:false when destDir does not exist', async () => {
    const nonExistent = join(workDir, 'does-not-exist')
    const result = await install({ tenantSlug: 'test', destDir: nonExistent, log: () => {} })
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  }, { timeout: 10000 })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: FAIL (current install uses `mkdir({ recursive: true })` so it succeeds even if destDir doesn't exist; we need to make destDir required).

- [ ] **Step 3: Update install.ts to validate destDir**

Modify `agencia-backend/scripts/features/welcome-banner/install.ts`. Add this check at the very start of the `install` function body, before `copyFile`:

```ts
  // Validate destDir exists
  try {
    const stat = await (await import('node:fs/promises')).stat(ctx.destDir)
    if (!stat.isDirectory()) {
      return { ok: false, error: `destDir is not a directory: ${ctx.destDir}` }
    }
  } catch {
    return { ok: false, error: `destDir does not exist: ${ctx.destDir}` }
  }
```

(Place this BEFORE the `mkdir(dirname(dest))` line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/install.ts agencia-backend/tests/unit/features/welcome-banner-install.spec.ts
git commit -m "feat(welcome-banner): install returns ok:false when destDir missing"
```

---

## Task 9: install.ts — return ok:false when template missing (TDD)

**Files:**
- Modify: `agencia-backend/scripts/features/welcome-banner/install.ts`
- Modify: `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`

- [ ] **Step 1: Add failing test**

To trigger a missing-template scenario, the install function needs to support a different template path in tests. Easiest: temporarily delete the template file before running install. Append:

```ts
  it('returns ok:false when template source is missing', async () => {
    await rm(templateRoot, { recursive: true, force: true })
    templateRoot = '/nonexistent' // ensures process.cwd() relative path fails
    const result = await install({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/template|ENOENT/)
  }, { timeout: 10000 })
```

Note: This test depends on `process.cwd()` being the `agencia-backend` directory at test time (which it is, since vitest runs from package root). If the template file doesn't exist at the relative path, `copyFile` will throw.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: FAIL (current implementation throws but doesn't catch — propagates as unhandled error).

- [ ] **Step 3: Wrap copyFile in try/catch**

In `install.ts`, wrap the `copyFile` call in try/catch. Replace the section that copies the file:

```ts
  try {
    await copyFile(TEMPLATE_PATH, dest)
    ctx.log(`✓ Copied ${COMPONENT_RELATIVE}`)
  } catch (err) {
    return {
      ok: false,
      error: `Failed to copy template: ${(err as Error).message}`,
      copiedFiles: [],
      envKeysAdded: [],
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/install.ts agencia-backend/tests/unit/features/welcome-banner-install.spec.ts
git commit -m "feat(welcome-banner): install returns ok:false when template missing"
```

---

## Task 10: install.ts — cleanup component on env append failure (TDD)

**Files:**
- Modify: `agencia-backend/scripts/features/welcome-banner/install.ts`
- Modify: `agencia-backend/tests/unit/features/welcome-banner-install.spec.ts`

- [ ] **Step 1: Add failing test for cleanup**

Append to the describe block in `welcome-banner-install.spec.ts`:

```ts
  it('removes copied component file if env append fails', async () => {
    // Pre-create .env.example as read-only so the appendFile/writeFile fails
    await writeFile(join(workDir, '.env.example'), 'INITIAL=value\n', 'utf-8')
    // Make destDir read-only AFTER copying the component
    // (We simulate by making .env.example a directory — appendFile will fail)
    await rm(join(workDir, '.env.example'))
    await mkdir(join(workDir, '.env.example'))

    const result = await install({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    expect(result.ok).toBe(false)
    // Component file should be cleaned up
    const { stat } = await import('node:fs/promises')
    await expect(
      stat(join(workDir, 'src', 'components', 'blocks', 'WelcomeBanner.tsx')),
    ).rejects.toThrow()
  }, { timeout: 10000 })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: FAIL (the orphan component file remains — current implementation doesn't clean up on env failure).

- [ ] **Step 3: Wrap env append in try/catch with cleanup**

Modify `agencia-backend/scripts/features/welcome-banner/install.ts`. Replace the env-append block:

```ts
  // Append env var to .env.example (create if missing)
  const envPath = join(ctx.destDir, ENV_EXAMPLE)
  try {
    let existing = ''
    try {
      existing = await (await import('node:fs/promises')).readFile(envPath, 'utf-8')
    } catch {
      // file does not exist — will create
    }
    if (!existing.includes(`${ENV_KEY}=`)) {
      try {
        await writeFile(envPath, existing ? `${existing}${ENV_KEY}=\n` : `${ENV_KEY}=\n`, 'utf-8')
        ctx.log(`✓ Appended ${ENV_KEY}= to ${ENV_EXAMPLE}`)
      } catch (err) {
        // Cleanup: remove the copied component file before returning
        try {
          await (await import('node:fs/promises')).rm(dest)
          ctx.log(`(cleanup) Removed ${COMPONENT_RELATIVE} after env append failure`)
        } catch {
          // Best-effort cleanup
        }
        return {
          ok: false,
          error: `Failed to append env var: ${(err as Error).message}`,
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: `Env handling failed: ${(err as Error).message}`,
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-install.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/install.ts agencia-backend/tests/unit/features/welcome-banner-install.spec.ts
git commit -m "feat(welcome-banner): install cleans up component on env append failure"
```

---

## Task 11: uninstall.ts — delete component file (TDD)

**Files:**
- Create: `agencia-backend/scripts/features/welcome-banner/uninstall.ts`
- Create: `agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts`

- [ ] **Step 1: Write the failing test**

Write `agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { uninstall } from '../../../scripts/features/welcome-banner/uninstall'

let workDir: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'welcome-banner-uninstall-test-'))
  await mkdir(join(workDir, 'src', 'components', 'blocks'), { recursive: true })
  await writeFile(
    join(workDir, 'src', 'components', 'blocks', 'WelcomeBanner.tsx'),
    'placeholder',
    'utf-8',
  )
})

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true })
})

describe('welcome-banner uninstall', () => {
  it('deletes the component file', async () => {
    const result = await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    expect(result.ok).toBe(true)
    await expect(stat(join(workDir, 'src', 'components', 'blocks', 'WelcomeBanner.tsx'))).rejects.toThrow()
  }, { timeout: 10000 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-uninstall.spec.ts`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Implement uninstall.ts**

Create `agencia-backend/scripts/features/welcome-banner/uninstall.ts`:

```ts
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { FeatureInstallContext, FeatureInstallResult } from '../types'

const COMPONENT_RELATIVE = 'src/components/blocks/WelcomeBanner.tsx'

export const uninstall = async (
  ctx: FeatureInstallContext,
): Promise<FeatureInstallResult> => {
  const target = join(ctx.destDir, COMPONENT_RELATIVE)
  try {
    await rm(target)
    ctx.log(`✓ Removed ${COMPONENT_RELATIVE}`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      return {
        ok: false,
        error: `Failed to remove component: ${(err as Error).message}`,
      }
    }
    // ENOENT is expected — no-op
    ctx.log(`(skipped) ${COMPONENT_RELATIVE} not present`)
  }
  return {
    ok: true,
    copiedFiles: [],
    envKeysAdded: [],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-uninstall.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/uninstall.ts agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts
git commit -m "feat(welcome-banner): uninstall deletes component file"
```

---

## Task 12: uninstall.ts — remove env var line (TDD)

**Files:**
- Modify: `agencia-backend/scripts/features/welcome-banner/uninstall.ts`
- Modify: `agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts`

- [ ] **Step 1: Add failing test**

Append to the describe block:

```ts
  it('removes WELCOME_BANNER_TEXT line from .env.example', async () => {
    await writeFile(
      join(workDir, '.env.example'),
      'OTHER_VAR=foo\nWELCOME_BANNER_TEXT=hello\nOTHER_VAR2=bar\n',
      'utf-8',
    )
    await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(join(workDir, '.env.example'), 'utf-8')
    expect(content).toContain('OTHER_VAR=foo')
    expect(content).toContain('OTHER_VAR2=bar')
    expect(content).not.toContain('WELCOME_BANNER_TEXT')
  }, { timeout: 10000 })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-uninstall.spec.ts`
Expected: FAIL (current uninstall doesn't touch .env.example).

- [ ] **Step 3: Implement env var removal**

Modify `agencia-backend/scripts/features/welcome-banner/uninstall.ts`. Add this block BEFORE the `return` at the end of the function:

```ts
  // Remove WELCOME_BANNER_TEXT from .env.example (no-op if missing)
  const envPath = join(ctx.destDir, '.env.example')
  try {
    const content = await (await import('node:fs/promises')).readFile(envPath, 'utf-8')
    const lines = content.split('\n')
    const filtered = lines.filter((line) => !line.startsWith('WELCOME_BANNER_TEXT='))
    await (await import('node:fs/promises')).writeFile(envPath, filtered.join('\n'), 'utf-8')
    if (lines.length !== filtered.length) {
      ctx.log(`✓ Removed WELCOME_BANNER_TEXT from .env.example`)
    }
  } catch {
    // .env.example missing — no-op
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-uninstall.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/uninstall.ts agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts
git commit -m "feat(welcome-banner): uninstall removes env var from .env.example"
```

---

## Task 13: uninstall.ts — no-op idempotency (TDD)

**Files:**
- Modify: `agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts`

- [ ] **Step 1: Add tests for no-op scenarios**

Append:

```ts
  it('no-ops gracefully if component file missing', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'welcome-banner-empty-'))
    try {
      const result = await uninstall({ tenantSlug: 'test', destDir: emptyDir, log: () => {} })
      expect(result.ok).toBe(true)
    } finally {
      await rm(emptyDir, { recursive: true, force: true })
    }
  }, { timeout: 10000 })

  it('no-ops gracefully if .env.example missing', async () => {
    const result = await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    expect(result.ok).toBe(true)
  }, { timeout: 10000 })

  it('no-ops gracefully if WELCOME_BANNER_TEXT not present in .env.example', async () => {
    await writeFile(join(workDir, '.env.example'), 'FOO=bar\n', 'utf-8')
    const result = await uninstall({ tenantSlug: 'test', destDir: workDir, log: () => {} })
    expect(result.ok).toBe(true)
  }, { timeout: 10000 })
```

- [ ] **Step 2: Run test to verify all pass**

Run: `cd agencia-backend && pnpm test tests/unit/features/welcome-banner-uninstall.spec.ts`
Expected: PASS (all no-op scenarios already handled by the implementation).

- [ ] **Step 3: Commit**

```bash
git add agencia-backend/tests/unit/features/welcome-banner-uninstall.spec.ts
git commit -m "test(welcome-banner): cover uninstall idempotency"
```

---

## Task 14: Register welcome-banner feature in `index.ts`

**Files:**
- Modify: `agencia-backend/scripts/features/index.ts`

- [ ] **Step 1: Add imports at the top of index.ts**

At the top of `agencia-backend/scripts/features/index.ts`, add:

```ts
import { install as welcomeBannerInstall } from './welcome-banner/install'
import { uninstall as welcomeBannerUninstall } from './welcome-banner/uninstall'
```

(Place with other imports, above the `FEATURES` constant.)

- [ ] **Step 2: Replace the stub entry**

In the `FEATURES` object, find the `welcomeBanner: stubFor(...)` entry (it's the one with `'welcomeBanner'` slug) and replace it with:

```ts
  welcomeBanner: {
    slug: 'welcomeBanner',
    displayName: 'Banner de bienvenida',
    description: 'Banner configurable por tenant con env var de fallback',
    install: welcomeBannerInstall,
    uninstall: welcomeBannerUninstall,
    envKeysRequired: ['WELCOME_BANNER_TEXT'],
  },
```

- [ ] **Step 3: Remove the `welcomeBanner` from `stubFor` calls**

If any `stubFor('welcomeBanner', ...)` remains, remove it (now replaced by the real entry above).

- [ ] **Step 4: Verify typecheck**

Run: `cd agencia-backend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/features/index.ts
git commit -m "feat(features): register welcome-banner feature with real install/uninstall"
```

---

## Task 15: Integration tests — happy path (enable/disable)

**Files:**
- Modify: `agencia-backend/tests/int/scripts/add-feature.int.spec.ts`

- [ ] **Step 1: Read the existing test file**

Read `agencia-backend/tests/int/scripts/add-feature.int.spec.ts` to understand its structure (especially `beforeEach` which creates a tenant).

- [ ] **Step 2: Add welcome-banner integration tests**

Append to the `describe('add-feature enable/disable/status', () => { ... })` block in the file:

```ts
  it('enables welcome-banner on a tenant', async () => {
    const slug = await resolveSlug()
    // Use a real destDir under /tmp so install doesn't fail
    // (We'll skip the actual fs side effects by checking only the DB flag.)
    await handleEnableFeature(slug, 'welcomeBanner')
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.welcomeBanner).toBe(true)
  })

  it('disables welcome-banner (idempotent)', async () => {
    const slug = await resolveSlug()
    await expect(handleDisableFeature(slug, 'welcomeBanner')).resolves.toBeUndefined()
    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.welcomeBanner).toBe(false)
  })
```

Note: the integration test exercises the real `install.ts` which writes to `destDir` = `/home/joseba/Clientes/clientes/<slug>/`. If that directory doesn't exist, install returns `ok: false` and the flag is rolled back. The test above asserts the DB flag, which is the contract the test cares about. Real filesystem effects can be verified with the manual smoke test or the e2e test in Task 16.

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd agencia-backend && pnpm test:int tests/int/scripts/add-feature.int.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/tests/int/scripts/add-feature.int.spec.ts
git commit -m "test(int): welcome-banner enable/disable happy path"
```

---

## Task 16: Integration test — rollback on install failure

**Files:**
- Modify: `agencia-backend/tests/int/scripts/add-feature.int.spec.ts`

- [ ] **Step 1: Add the rollback test**

Append a new `describe` block at the end of the file:

```ts
describe('add-feature rollback on install failure', () => {
  it('rolls back flag to false when install fails (no destDir)', async () => {
    const payload = await getPayload({ config })
    const slug = `rollback-test-${Date.now()}`
    await payload.create({
      collection: 'tenants',
      data: {
        name: `Rollback Test ${slug}`,
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

    // handleEnableFeature calls install() with destDir = /home/joseba/Clientes/clientes/<slug>
    // If that directory doesn't exist (which it won't for this fresh test slug),
    // install returns ok:false and the flag is rolled back.
    await expect(handleEnableFeature(slug, 'welcomeBanner')).rejects.toThrow()

    const tenant = await getTenantBySlug(slug)
    expect(tenant?.features.welcomeBanner).toBe(false)

    // Cleanup
    await payload.delete({ collection: 'tenants', where: { slug: { equals: slug } } })
  })
})
```

- [ ] **Step 2: Run the new test to verify it passes**

Run: `cd agencia-backend && pnpm test:int tests/int/scripts/add-feature.int.spec.ts -t "rollback"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add agencia-backend/tests/int/scripts/add-feature.int.spec.ts
git commit -m "test(int): verify flag rollback when install fails"
```

---

## Task 17: E2E tests — exit behavior for welcome-banner

**Files:**
- Modify: `agencia-backend/tests/int/scripts/add-feature-exit.int.spec.ts`

- [ ] **Step 1: Read the existing e2e test file**

Read `agencia-backend/tests/int/scripts/add-feature-exit.int.spec.ts` to understand its setup (it spawns the script as a child process).

- [ ] **Step 2: Add welcome-banner exit tests**

Inside the existing `describe('add-feature script exits cleanly', () => { ... })` block, add additional `it` cases:

```ts
  it(
    '--status welcome-banner exits with code 0',
    async () => {
      const exitCode = await runScriptAsChild([
        '--status',
        `--slug=${testTenantSlug}`,
      ])
      expect(exitCode).toBe(0)
    },
    TEST_TIMEOUT_MS,
  )
```

(Note: `--status` doesn't depend on which feature, but the test demonstrates the script exits cleanly when querying the welcome-banner flag too. The same `runScriptAsChild` already exists in the file.)

- [ ] **Step 3: Run the e2e test to verify it passes**

Run: `cd agencia-backend && pnpm test:int tests/int/scripts/add-feature-exit.int.spec.ts`
Expected: PASS (in ~2-3s).

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/tests/int/scripts/add-feature-exit.int.spec.ts
git commit -m "test(e2e): welcome-banner script exits cleanly"
```

---

## Task 18: README for the welcome-banner feature

**Files:**
- Create: `agencia-backend/scripts/features/welcome-banner/README.md`

- [ ] **Step 1: Write the README**

Write `agencia-backend/scripts/features/welcome-banner/README.md`:

````markdown
# Feature: Banner de bienvenida

**Slug:** `welcomeBanner`
**Estado:** Implementada (Sprint 0.5 — demo del pipeline `add-feature`).

## Qué hace

Agrega un block de Payload `welcomeBanner` con dos campos:
- `text` (string opcional) — texto del banner. Override por admin.
- `enabled` (checkbox, default `true`) — switch on/off del banner.

El componente frontend (`WelcomeBanner.tsx`) se copia al proyecto del cliente en `src/components/blocks/` cuando se prende la feature.

## Cómo se usa

```bash
pnpm add-feature welcome-banner --slug=<tenant-slug>
pnpm add-feature welcome-banner --slug=<tenant-slug> --remove
pnpm add-feature --status --slug=<tenant-slug>
```

## Archivos que copia

- `src/components/blocks/WelcomeBanner.tsx` (template desde `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`)

## Env vars que agrega

- `WELCOME_BANNER_TEXT=` (apendeada al `.env.example` del cliente; no toca `.env` ni `.env.local`)

## Resolución del texto

1. `block.text` (si está set en admin)
2. `process.env.WELCOME_BANNER_TEXT` (fallback)
3. `'¡Bienvenido!'` (literal default)

## Post-install manual

Después de `pnpm add-feature welcome-banner --slug=<slug>` el cliente debe:

1. **Wire el block en `BlockRenderer.tsx`** — abrir `nextjs-starter/src/components/BlockRenderer.tsx` y agregar:
   ```tsx
   import WelcomeBanner from '@/components/blocks/WelcomeBanner'
   // ...
   const components: Record<string, React.ComponentType<{ data: any }>> = {
     // ... existentes ...
     welcomeBanner: WelcomeBanner,
   }
   ```

2. **Setear `WELCOME_BANNER_TEXT`** en `.env` (no `.env.example`):
   ```
   WELCOME_BANNER_TEXT=Bienvenido a Mi Tienda
   ```

3. **(Opcional)** En Payload admin → abrir una página → tab "Content" → "Add Block" → "Welcome Banner" → setear texto custom.

## Limitaciones

- El wiring de `BlockRenderer` es manual. Pasar a auto-discovery es decisión de un sprint futuro (afecta el template).
- No hay soporte para Astro todavía (solo Next.js).
- Si install copia el componente pero falla appendeando la env var, intentamos limpiar el componente. Si ese cleanup también falla, queda el archivo como orphan. El `uninstall` posterior reconcilia.
````

- [ ] **Step 2: Commit**

```bash
git add agencia-backend/scripts/features/welcome-banner/README.md
git commit -m "docs(welcome-banner): document feature and post-install steps"
```

---

## Task 19: Push branch and open PR (or merge directly)

- [ ] **Step 1: Verify all tests pass**

Run from `agencia-backend/`:
```bash
pnpm test:int
pnpm test tests/unit
pnpm typecheck
```

Expected: All green (the pre-existing failing tests `validateLayoutStructure` and `sync-template` are unrelated and out of scope).

- [ ] **Step 2: Decide on merge strategy**

Decide with the user:
- (A) Push branch + open PR for review
- (B) Merge directly to `main` (since this is the agency's main branch and demo work)

The user previously pushed directly. Default to merge directly unless they ask for a PR.

- [ ] **Step 3: Merge or push per chosen strategy**

If merging directly:
```bash
cd ..  # monorepo root
git push origin main
```

If pushing a branch + PR:
```bash
cd ..
git checkout -b feature/welcome-banner-demo
git push origin feature/welcome-banner-demo
gh pr create --title "feat: welcome-banner demo feature" --body "Implements the first non-stub feature for add-feature pipeline. Validates install + env vars + rollback. See docs/superpowers/specs/2026-08-21-welcome-banner-demo-design.md"
```

---

## Definition of Done

- [ ] All tasks above completed and committed.
- [ ] `pnpm test:int` passes (except pre-existing failures unrelated to this work).
- [ ] `pnpm test tests/unit` passes.
- [ ] `pnpm typecheck` passes.
- [ ] Manual smoke test: create a real client (or use existing), run `pnpm add-feature welcome-banner --slug=<slug>`, observe:
  - Flag is `true` after run
  - File `src/components/blocks/WelcomeBanner.tsx` exists in client project
  - `.env.example` contains `WELCOME_BANNER_TEXT=`
  - Run with `--remove`, observe all three are cleaned up
- [ ] Changes pushed to `origin/main`.
