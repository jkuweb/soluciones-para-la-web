# Bulk `sync:clients` and `update:clients` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new bulk commands (`pnpm sync:clients` and `pnpm update:clients`) that apply template changes to all clients in the workspace in a single run, with dry-run by default and per-client error isolation.

**Architecture:** Two thin orchestrator scripts that loop over all client slugs, delegate per-client work to the existing `syncTemplate()` and `mergePackageJson()` functions, aggregate results, and print a summary table. No new sync logic — pure orchestration + output formatting.

**Tech Stack:** TypeScript, Node 20+, Vitest, existing Payload/scripts infrastructure.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `agencia-backend/scripts/sync-clients.ts` | NEW. Bulk file sync orchestrator. Exports `parseSyncAllArgs`, `syncOneClient`, `runSyncAll`, `formatSyncAllSummary`, `run`. |
| `agencia-backend/scripts/update-clients.ts` | NEW. Bulk package.json update orchestrator. Exports `parseUpdateAllArgs`, `updateOneClient`, `runUpdateAll`, `formatUpdateAllSummary`, `run`. |
| `agencia-backend/tests/int/scripts/sync-clients.int.spec.ts` | NEW. Integration tests for sync-clients. |
| `agencia-backend/tests/int/scripts/update-clients.int.spec.ts` | NEW. Integration tests for update-clients. |
| `agencia-backend/package.json` | MODIFY. Add `sync:clients` and `update:clients` scripts. |
| `AGENTS.md` | MODIFY. Add "Bulk operations" section. |

Reused (no changes):
- `syncTemplate()`, `detectTemplateType()`, `getClientDir()`, `getTemplateDir()` from `sync-template.ts`
- `mergePackageJson()`, `readPackageJson()` from `update-deps.ts`
- `listClientSlugs()` from `audit-clients.ts`
- `readTemplateVersion()` from `lib/template-version.ts`

---

## Task 1: Add `syncOneClient` to `sync-clients.ts` (with type scaffolding)

**Files:**
- Create: `agencia-backend/scripts/sync-clients.ts`
- Test: `agencia-backend/tests/int/scripts/sync-clients.int.spec.ts`

- [ ] **Step 1: Create the test file with `parseSyncAllArgs` failing tests**

```ts
// agencia-backend/tests/int/scripts/sync-clients.int.spec.ts
import { describe, it, expect } from 'vitest'
import { parseSyncAllArgs } from '../../../scripts/sync-clients'

describe('parseSyncAllArgs', () => {
  it('returns defaults when no args given', () => {
    expect(parseSyncAllArgs([])).toEqual({ apply: false, filter: 'all' })
  })

  it('parses --apply', () => {
    expect(parseSyncAllArgs(['--apply']).apply).toBe(true)
  })

  it('parses --filter=outdated and --filter=all', () => {
    expect(parseSyncAllArgs(['--filter=outdated']).filter).toBe('outdated')
    expect(parseSyncAllArgs(['--filter=all']).filter).toBe('all')
  })

  it('rejects invalid --filter value', () => {
    expect(() => parseSyncAllArgs(['--filter=foo'])).toThrow(/Invalid --filter/)
  })

  it('parses --template=astro and --template=nextjs', () => {
    expect(parseSyncAllArgs(['--template=astro']).template).toBe('astro')
    expect(parseSyncAllArgs(['--template=nextjs']).template).toBe('nextjs')
  })

  it('rejects invalid --template value', () => {
    expect(() => parseSyncAllArgs(['--template=svelte'])).toThrow(/Invalid --template/)
  })

  it('rejects unknown argument', () => {
    expect(() => parseSyncAllArgs(['--weird'])).toThrow(/Unknown argument/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: FAIL with "Cannot find module '../../../scripts/sync-clients'"

- [ ] **Step 3: Create the script file with types and `parseSyncAllArgs`**

```ts
// agencia-backend/scripts/sync-clients.ts
import path from 'node:path'
import { syncTemplate, detectTemplateType, type SyncOptions, type FrontendType } from './sync-template.js'
import { listClientSlugs } from './audit-clients.js'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export type SyncAllOptions = {
  apply: boolean
  filter: 'all' | 'outdated'
  template?: FrontendType
}

export type ClientSyncStatus =
  | { slug: string; status: 'updated'; template: FrontendType; filesChanged: number; filesAdded: number }
  | { slug: string; status: 'skipped'; reason: 'up-to-date' }
  | { slug: string; status: 'error'; reason: string }

export type SyncAllResult = {
  total: number
  updated: number
  skipped: number
  errors: number
  clients: ClientSyncStatus[]
}

const USAGE =
  'Usage: pnpm sync:clients [--apply] [--filter=outdated] [--template=astro|nextjs]'

export const parseSyncAllArgs = (args: string[]): SyncAllOptions => {
  let apply = false
  let filter: 'all' | 'outdated' = 'all'
  let template: FrontendType | undefined

  for (const arg of args) {
    if (arg === '--apply') {
      apply = true
    } else if (arg === '--filter=outdated') {
      filter = 'outdated'
    } else if (arg === '--filter=all') {
      filter = 'all'
    } else if (arg.startsWith('--template=')) {
      const value = arg.slice('--template='.length)
      if (value !== 'astro' && value !== 'nextjs') {
        throw new Error(`Invalid --template value: ${value}. Use "astro" or "nextjs".`)
      }
      template = value
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('HELP')
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  const options: SyncAllOptions = { apply, filter }
  if (template !== undefined) options.template = template
  return options
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/sync-clients.ts agencia-backend/tests/int/scripts/sync-clients.int.spec.ts
git commit -m "feat(scripts): scaffold sync-clients.ts with parseSyncAllArgs"
```

---

## Task 2: Implement `syncOneClient`

**Files:**
- Modify: `agencia-backend/scripts/sync-clients.ts`
- Modify: `agencia-backend/tests/int/scripts/sync-clients.int.spec.ts`

- [ ] **Step 1: Add failing tests for `syncOneClient`**

Append to the test file (after the existing `parseSyncAllArgs` describe block):

```ts
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { syncOneClient, getAllowlist, MONOREPO_ROOT } from '../../../scripts/sync-clients'

const ASTRO_TEMPLATE = join(MONOREPO_ROOT, 'astro-starter')
const NEXTJS_TEMPLATE = join(MONOREPO_ROOT, 'nextjs-starter')

const setupClientMirror = (root: string, templateType: 'astro' | 'nextjs' = 'astro'): string => {
  const clientDir = join(root, 'client-x')
  mkdirSync(clientDir, { recursive: true })
  const templateDir = templateType === 'astro' ? ASTRO_TEMPLATE : NEXTJS_TEMPLATE
  const pkg = JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf-8'))
  writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))
  for (const relPath of getAllowlist(templateType)) {
    const src = join(templateDir, relPath)
    const dest = join(clientDir, relPath)
    mkdirSync(join(dest, '..'), { recursive: true })
    copyFileSync(src, dest)
  }
  return clientDir
}

describe('syncOneClient', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sync-one-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns "skipped" when client mirrors the template', async () => {
    const clientDir = setupClientMirror(root)
    const result = await syncOneClient('client-x', { apply: false, filter: 'all' }, root)
    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('up-to-date')
  })

  it('returns "updated" when client has different files', async () => {
    const clientDir = setupClientMirror(root)
    writeFileSync(join(clientDir, 'astro.config.mjs'), '// changed')
    const result = await syncOneClient('client-x', { apply: false, filter: 'all' }, root)
    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.filesChanged).toBe(1)
    }
  })

  it('returns "error" when client dir does not exist', async () => {
    const result = await syncOneClient('missing', { apply: false, filter: 'all' }, root)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.reason).toMatch(/does not exist|Cannot detect/)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: FAIL with "syncOneClient is not a function"

- [ ] **Step 3: Implement `syncOneClient`**

Add to `agencia-backend/scripts/sync-clients.ts` after `parseSyncAllArgs`:

```ts
export const syncOneClient = async (
  slug: string,
  options: SyncAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<ClientSyncStatus> => {
  const clientDir = path.join(clientDirBase, slug)
  let templateType: FrontendType
  try {
    templateType = options.template ?? (await detectTemplateType(clientDir))
  } catch (err) {
    return { slug, status: 'error', reason: (err as Error).message }
  }

  try {
    const syncOpts: SyncOptions = {
      slug,
      apply: options.apply,
      verbose: false,
      template: templateType,
      clientDirOverride: clientDir,
    }
    const result = await syncTemplate(syncOpts)
    const hasChanges = result.updated + result.added > 0
    if (!hasChanges) {
      return { slug, status: 'skipped', reason: 'up-to-date' }
    }
    return {
      slug,
      status: 'updated',
      template: templateType,
      filesChanged: result.updated,
      filesAdded: result.added,
    }
  } catch (err) {
    return { slug, status: 'error', reason: (err as Error).message }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/sync-clients.ts agencia-backend/tests/int/scripts/sync-clients.int.spec.ts
git commit -m "feat(scripts): implement syncOneClient with template detection"
```

---

## Task 3: Implement `runSyncAll`

**Files:**
- Modify: `agencia-backend/scripts/sync-clients.ts`
- Modify: `agencia-backend/tests/int/scripts/sync-clients.int.spec.ts`

- [ ] **Step 1: Add failing tests for `runSyncAll`**

Append to the test file:

```ts
import { runSyncAll } from '../../../scripts/sync-clients'

describe('runSyncAll', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'run-sync-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns empty result when no clients found', async () => {
    const result = await runSyncAll({ apply: false, filter: 'all' }, root)
    expect(result.total).toBe(0)
    expect(result.clients).toEqual([])
  })

  it('processes all clients by default (filter=all)', async () => {
    setupClientMirror(root)
    const result = await runSyncAll({ apply: false, filter: 'all' }, root)
    expect(result.total).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('skips up-to-date clients when filter=outdated', async () => {
    const clientDir = setupClientMirror(root)
    writeFileSync(join(clientDir, 'astro.config.mjs'), '// changed')
    const result = await runSyncAll({ apply: false, filter: 'outdated' }, root)
    expect(result.total).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it('skips client entirely when filter=outdated and no changes', async () => {
    setupClientMirror(root)
    const result = await runSyncAll({ apply: false, filter: 'outdated' }, root)
    expect(result.total).toBe(1)
    expect(result.clients).toEqual([]) // filtered out
  })

  it('continues on error and counts it', async () => {
    setupClientMirror(root)
    // Add a second client that will fail
    const brokenDir = join(root, 'broken')
    mkdirSync(brokenDir, { recursive: true })
    // No package.json - will fail
    const result = await runSyncAll({ apply: false, filter: 'all' }, root)
    expect(result.total).toBe(2)
    expect(result.errors).toBe(1)
    expect(result.skipped).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: FAIL with "runSyncAll is not a function"

- [ ] **Step 3: Implement `runSyncAll`**

Add to `agencia-backend/scripts/sync-clients.ts`:

```ts
export const runSyncAll = async (
  options: SyncAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<SyncAllResult> => {
  const slugs = await listClientSlugs(clientDirBase)
  if (slugs.length === 0) {
    return { total: 0, updated: 0, skipped: 0, errors: 0, clients: [] }
  }
  const clients: ClientSyncStatus[] = []
  for (const slug of slugs) {
    const result = await syncOneClient(slug, options, clientDirBase)
    if (options.filter === 'outdated' && result.status === 'skipped') {
      continue
    }
    clients.push(result)
  }
  return {
    total: slugs.length,
    updated: clients.filter((c) => c.status === 'updated').length,
    skipped: clients.filter((c) => c.status === 'skipped').length,
    errors: clients.filter((c) => c.status === 'error').length,
    clients,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/sync-clients.ts agencia-backend/tests/int/scripts/sync-clients.int.spec.ts
git commit -m "feat(scripts): implement runSyncAll with filter and error handling"
```

---

## Task 4: Implement `formatSyncAllSummary`

**Files:**
- Modify: `agencia-backend/scripts/sync-clients.ts`
- Modify: `agencia-backend/tests/int/scripts/sync-clients.int.spec.ts`

- [ ] **Step 1: Add failing tests for `formatSyncAllSummary`**

Append to the test file:

```ts
import { formatSyncAllSummary, type SyncAllResult } from '../../../scripts/sync-clients'

describe('formatSyncAllSummary', () => {
  const baseResult: SyncAllResult = {
    total: 3,
    updated: 1,
    skipped: 1,
    errors: 1,
    clients: [
      { slug: 'client-a', status: 'updated', template: 'astro', filesChanged: 2, filesAdded: 1 },
      { slug: 'client-b', status: 'skipped', reason: 'up-to-date' },
      { slug: 'client-c', status: 'error', reason: 'package.json missing' },
    ],
  }

  it('includes header, divider, rows, and summary line', () => {
    const lines = formatSyncAllSummary(baseResult)
    expect(lines[0]).toMatch(/Client.*Template.*Files.*Status/)
    expect(lines[1]).toMatch(/----/)
    expect(lines.some((l) => l.includes('client-a') && l.includes('2c+1a'))).toBe(true)
    expect(lines.some((l) => l.includes('client-b') && l.includes('up-to-date'))).toBe(true)
    expect(lines.some((l) => l.includes('client-c') && l.includes('error'))).toBe(true)
    expect(lines.some((l) => l.match(/Total: 3 \| Updated: 1 \| Skipped: 1 \| Errors: 1/))).toBe(true)
  })

  it('handles empty result set', () => {
    const lines = formatSyncAllSummary({ total: 0, updated: 0, skipped: 0, errors: 0, clients: [] })
    expect(lines.some((l) => l.match(/Total: 0/))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: FAIL with "formatSyncAllSummary is not a function"

- [ ] **Step 3: Implement `formatSyncAllSummary`**

Add to `agencia-backend/scripts/sync-clients.ts`:

```ts
const pad = (s: string, n: number): string => s.padEnd(n).slice(0, n)

export const formatSyncAllSummary = (result: SyncAllResult): string[] => {
  const headers = ['Client', 'Template', 'Files', 'Status']
  const widths = [16, 10, 10, 40]
  const rows: string[][] = result.clients.map((c) => {
    if (c.status === 'updated') {
      return [c.slug, c.template, `${c.filesChanged}c+${c.filesAdded}a`, 'updated']
    }
    if (c.status === 'skipped') {
      return [c.slug, '-', '-', 'skipped (up-to-date)']
    }
    return [c.slug, '-', '-', `error: ${c.reason}`]
  })
  const lines: string[] = []
  lines.push(headers.map((h, i) => pad(h, widths[i])).join('  '))
  lines.push(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of rows) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join('  '))
  }
  lines.push('')
  lines.push(
    `Total: ${result.total} | Updated: ${result.updated} | Skipped: ${result.skipped} | Errors: ${result.errors}`,
  )
  return lines
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- sync-clients.int.spec.ts`
Expected: PASS (17 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/sync-clients.ts agencia-backend/tests/int/scripts/sync-clients.int.spec.ts
git commit -m "feat(scripts): add formatSyncAllSummary table formatter"
```

---

## Task 5: Wire up `run()` in `sync-clients.ts`

**Files:**
- Modify: `agencia-backend/scripts/sync-clients.ts`

- [ ] **Step 1: Add `run()` function**

Add to `agencia-backend/scripts/sync-clients.ts` (at the end):

```ts
export const run = async (): Promise<void> => {
  let options: SyncAllOptions
  try {
    options = parseSyncAllArgs(process.argv.slice(2))
  } catch (err) {
    if ((err as Error).message === 'HELP') {
      console.log(USAGE)
      return
    }
    console.error(`Error: ${(err as Error).message}`)
    console.log(USAGE)
    process.exit(1)
  }

  console.log(
    `[sync:clients]${options.apply ? ' APPLY' : ' (dry-run)'}${options.filter === 'outdated' ? ' filter=outdated' : ''}${options.template ? ` template=${options.template}` : ' (auto-detect)'}`,
  )

  const result = await runSyncAll(options)

  for (const line of formatSyncAllSummary(result)) {
    console.log(line)
  }

  if (!options.apply) {
    console.log('Run with --apply to apply changes')
  }

  if (result.errors > 0) {
    process.exit(1)
  }
}
```

- [ ] **Step 2: Run typecheck to verify it compiles**

Run: `cd agencia-backend && pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add agencia-backend/scripts/sync-clients.ts
git commit -m "feat(scripts): wire run() entry point in sync-clients.ts"
```

---

## Task 6: Scaffold `update-clients.ts` with types and `parseUpdateAllArgs`

**Files:**
- Create: `agencia-backend/scripts/update-clients.ts`
- Create: `agencia-backend/tests/int/scripts/update-clients.int.spec.ts`

- [ ] **Step 1: Create the test file with `parseUpdateAllArgs` tests**

```ts
// agencia-backend/tests/int/scripts/update-clients.int.spec.ts
import { describe, it, expect } from 'vitest'
import { parseUpdateAllArgs } from '../../../scripts/update-clients'

describe('parseUpdateAllArgs', () => {
  it('returns defaults when no args given', () => {
    expect(parseUpdateAllArgs([])).toEqual({ apply: false, filter: 'all', skipInstall: false })
  })

  it('parses --apply', () => {
    expect(parseUpdateAllArgs(['--apply']).apply).toBe(true)
  })

  it('parses --skip-install', () => {
    expect(parseUpdateAllArgs(['--skip-install']).skipInstall).toBe(true)
  })

  it('parses --filter=outdated and --filter=all', () => {
    expect(parseUpdateAllArgs(['--filter=outdated']).filter).toBe('outdated')
    expect(parseUpdateAllArgs(['--filter=all']).filter).toBe('all')
  })

  it('rejects invalid --filter value', () => {
    expect(() => parseUpdateAllArgs(['--filter=foo'])).toThrow(/Invalid --filter/)
  })

  it('parses --template=astro and --template=nextjs', () => {
    expect(parseUpdateAllArgs(['--template=astro']).template).toBe('astro')
    expect(parseUpdateAllArgs(['--template=nextjs']).template).toBe('nextjs')
  })

  it('rejects invalid --template value', () => {
    expect(() => parseUpdateAllArgs(['--template=svelte'])).toThrow(/Invalid --template/)
  })

  it('rejects unknown argument', () => {
    expect(() => parseUpdateAllArgs(['--weird'])).toThrow(/Unknown argument/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- update-clients.int.spec.ts`
Expected: FAIL with "Cannot find module '../../../scripts/update-clients'"

- [ ] **Step 3: Create the script file with types and `parseUpdateAllArgs`**

```ts
// agencia-backend/scripts/update-clients.ts
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import {
  readPackageJson,
  mergePackageJson,
  type PackageJson,
} from './update-deps.js'
import { listClientSlugs } from './audit-clients.js'
import {
  getClientDir,
  getTemplateDir,
  detectTemplateType,
  type FrontendType,
} from './sync-template.js'

const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export type UpdateAllOptions = {
  apply: boolean
  filter: 'all' | 'outdated'
  skipInstall: boolean
  template?: FrontendType
}

export type ClientUpdateStatus =
  | { slug: string; status: 'updated'; template: FrontendType; added: number; updated: number; installed: boolean }
  | { slug: string; status: 'skipped'; reason: 'up-to-date' }
  | { slug: string; status: 'error'; reason: string }

export type UpdateAllResult = {
  total: number
  updated: number
  skipped: number
  errors: number
  clients: ClientUpdateStatus[]
}

const USAGE =
  'Usage: pnpm update:clients [--apply] [--filter=outdated] [--template=astro|nextjs] [--skip-install]'

export const parseUpdateAllArgs = (args: string[]): UpdateAllOptions => {
  let apply = false
  let filter: 'all' | 'outdated' = 'all'
  let skipInstall = false
  let template: FrontendType | undefined

  for (const arg of args) {
    if (arg === '--apply') {
      apply = true
    } else if (arg === '--filter=outdated') {
      filter = 'outdated'
    } else if (arg === '--filter=all') {
      filter = 'all'
    } else if (arg === '--skip-install') {
      skipInstall = true
    } else if (arg.startsWith('--template=')) {
      const value = arg.slice('--template='.length)
      if (value !== 'astro' && value !== 'nextjs') {
        throw new Error(`Invalid --template value: ${value}. Use "astro" or "nextjs".`)
      }
      template = value
    } else if (arg === '--help' || arg === '-h') {
      throw new Error('HELP')
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  const options: UpdateAllOptions = { apply, filter, skipInstall }
  if (template !== undefined) options.template = template
  return options
}

// Re-export for tests
export { detectTemplateType }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- update-clients.int.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/update-clients.ts agencia-backend/tests/int/scripts/update-clients.int.spec.ts
git commit -m "feat(scripts): scaffold update-clients.ts with parseUpdateAllArgs"
```

---

## Task 7: Implement `updateOneClient` (dry-run path)

**Files:**
- Modify: `agencia-backend/scripts/update-clients.ts`
- Modify: `agencia-backend/tests/int/scripts/update-clients.int.spec.ts`

- [ ] **Step 1: Add failing tests for `updateOneClient` in dry-run mode**

Append to the test file:

```ts
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { updateOneClient, MONOREPO_ROOT } from '../../../scripts/update-clients'

const ASTRO_TEMPLATE = join(MONOREPO_ROOT, 'astro-starter')

const setupClientMirror = (root: string): string => {
  const clientDir = join(root, 'client-x')
  mkdirSync(clientDir, { recursive: true })
  const pkg = JSON.parse(readFileSync(join(ASTRO_TEMPLATE, 'package.json'), 'utf-8'))
  writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))
  return clientDir
}

describe('updateOneClient (dry-run)', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'update-one-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns "skipped" when package.json matches template', async () => {
    setupClientMirror(root)
    const result = await updateOneClient('client-x', { apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.status).toBe('skipped')
  })

  it('returns "updated" when client has client-only deps (dry-run)', async () => {
    const clientDir = setupClientMirror(root)
    const pkg = JSON.parse(readFileSync(join(clientDir, 'package.json'), 'utf-8'))
    pkg.dependencies = { ...pkg.dependencies, 'client-extra': '^1.0.0' }
    writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))

    const result = await updateOneClient('client-x', { apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.added).toBeGreaterThan(0)
      expect(result.installed).toBe(false)
    }
  })

  it('returns "error" when client dir missing', async () => {
    const result = await updateOneClient('missing', { apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.status).toBe('error')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- update-clients.int.spec.ts`
Expected: FAIL with "updateOneClient is not a function"

- [ ] **Step 3: Implement `updateOneClient` (dry-run and apply paths)**

Add to `agencia-backend/scripts/update-clients.ts` after `parseUpdateAllArgs`:

```ts
export const updateOneClient = async (
  slug: string,
  options: UpdateAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<ClientUpdateStatus> => {
  const clientDir = path.join(clientDirBase, slug)
  let templateType: FrontendType
  let clientPkg: PackageJson
  let templatePkg: PackageJson

  try {
    templateType = options.template ?? (await detectTemplateType(clientDir))
    clientPkg = await readPackageJson(clientDir)
    templatePkg = await readPackageJson(getTemplateDir(templateType))
  } catch (err) {
    return { slug, status: 'error', reason: (err as Error).message }
  }

  const { pkg, changes } = mergePackageJson(clientPkg, templatePkg)
  const hasChanges = changes.added.length + changes.updated.length > 0
  const templateVersion = templatePkg.version ?? '0.0.0'

  if (!hasChanges) {
    return { slug, status: 'skipped', reason: 'up-to-date' }
  }

  if (!options.apply) {
    return {
      slug,
      status: 'updated',
      template: templateType,
      added: changes.added.length,
      updated: changes.updated.length,
      installed: false,
    }
  }

  // Apply mode
  try {
    const ts = Math.floor(Date.now() / 1000)
    const backupPath = path.join(clientDir, `package.json.bak-${ts}`)
    const currentRaw = await readFile(path.join(clientDir, 'package.json'), 'utf-8')
    await writeFile(backupPath, currentRaw, 'utf-8')
    await writeFile(
      path.join(clientDir, 'package.json'),
      `${JSON.stringify(pkg, null, 2)}\n`,
      'utf-8',
    )

    // Update .template-version.json (best effort)
    const versionFile = path.join(clientDir, '.template-version.json')
    try {
      const versionRaw = await readFile(versionFile, 'utf-8')
      const meta = JSON.parse(versionRaw) as Record<string, unknown>
      meta.template = templateType
      meta.version = templateVersion
      meta.lastSyncedAt = new Date().toISOString()
      await writeFile(versionFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8')
    } catch {
      // missing or invalid - skip
    }
  } catch (err) {
    return { slug, status: 'error', reason: (err as Error).message }
  }

  let installed = false
  if (!options.skipInstall) {
    try {
      const code = await runPnpmInstall(clientDir)
      if (code !== 0) {
        return { slug, status: 'error', reason: `pnpm install exited with code ${code}` }
      }
      installed = true
    } catch (err) {
      return { slug, status: 'error', reason: (err as Error).message }
    }
  }

  return {
    slug,
    status: 'updated',
    template: templateType,
    added: changes.added.length,
    updated: changes.updated.length,
    installed,
  }
}

const runPnpmInstall = (cwd: string): Promise<number | null> => {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code))
  })
}

// Re-export for tests
export { getClientDir }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- update-clients.int.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/update-clients.ts agencia-backend/tests/int/scripts/update-clients.int.spec.ts
git commit -m "feat(scripts): implement updateOneClient with dry-run and apply paths"
```

---

## Task 8: Implement `runUpdateAll` and `formatUpdateAllSummary`

**Files:**
- Modify: `agencia-backend/scripts/update-clients.ts`
- Modify: `agencia-backend/tests/int/scripts/update-clients.int.spec.ts`

- [ ] **Step 1: Add failing tests**

Append to the test file:

```ts
import { runUpdateAll, formatUpdateAllSummary, type UpdateAllResult } from '../../../scripts/update-clients'

describe('runUpdateAll', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'run-update-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns empty result when no clients', async () => {
    const result = await runUpdateAll({ apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.total).toBe(0)
  })

  it('processes all clients by default', async () => {
    setupClientMirror(root)
    const result = await runUpdateAll({ apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.total).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('skips up-to-date clients when filter=outdated', async () => {
    setupClientMirror(root)
    const result = await runUpdateAll({ apply: false, filter: 'outdated', skipInstall: false }, root)
    expect(result.total).toBe(1)
    expect(result.clients).toEqual([])
  })

  it('continues on error', async () => {
    setupClientMirror(root)
    const brokenDir = join(root, 'broken')
    mkdirSync(brokenDir, { recursive: true })
    const result = await runUpdateAll({ apply: false, filter: 'all', skipInstall: false }, root)
    expect(result.total).toBe(2)
    expect(result.errors).toBe(1)
  })
})

describe('formatUpdateAllSummary', () => {
  const baseResult: UpdateAllResult = {
    total: 2,
    updated: 1,
    skipped: 0,
    errors: 1,
    clients: [
      { slug: 'client-a', status: 'updated', template: 'astro', added: 2, updated: 1, installed: true },
      { slug: 'client-b', status: 'error', reason: 'package.json missing' },
    ],
  }

  it('includes header, divider, rows, and summary line', () => {
    const lines = formatUpdateAllSummary(baseResult)
    expect(lines[0]).toMatch(/Client.*Template.*Pkg.*Status/)
    expect(lines.some((l) => l.includes('client-a') && l.includes('2+1~'))).toBe(true)
    expect(lines.some((l) => l.includes('client-b') && l.includes('error'))).toBe(true)
    expect(lines.some((l) => l.match(/Total: 2 \| Updated: 1 \| Skipped: 0 \| Errors: 1/))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agencia-backend && pnpm test:int -- update-clients.int.spec.ts`
Expected: FAIL with "runUpdateAll is not a function"

- [ ] **Step 3: Implement `runUpdateAll` and `formatUpdateAllSummary`**

Add to `agencia-backend/scripts/update-clients.ts`:

```ts
export const runUpdateAll = async (
  options: UpdateAllOptions,
  clientDirBase: string = CLIENTS_DIR,
): Promise<UpdateAllResult> => {
  const slugs = await listClientSlugs(clientDirBase)
  if (slugs.length === 0) {
    return { total: 0, updated: 0, skipped: 0, errors: 0, clients: [] }
  }
  const clients: ClientUpdateStatus[] = []
  for (const slug of slugs) {
    const result = await updateOneClient(slug, options, clientDirBase)
    if (options.filter === 'outdated' && result.status === 'skipped') {
      continue
    }
    clients.push(result)
  }
  return {
    total: slugs.length,
    updated: clients.filter((c) => c.status === 'updated').length,
    skipped: clients.filter((c) => c.status === 'skipped').length,
    errors: clients.filter((c) => c.status === 'error').length,
    clients,
  }
}

const pad = (s: string, n: number): string => s.padEnd(n).slice(0, n)

export const formatUpdateAllSummary = (result: UpdateAllResult): string[] => {
  const headers = ['Client', 'Template', 'PkgΔ', 'Status']
  const widths = [16, 10, 8, 40]
  const rows: string[][] = result.clients.map((c) => {
    if (c.status === 'updated') {
      return [c.slug, c.template, `${c.added}+${c.updated}~`, 'updated']
    }
    if (c.status === 'skipped') {
      return [c.slug, '-', '-', 'skipped (up-to-date)']
    }
    return [c.slug, '-', '-', `error: ${c.reason}`]
  })
  const lines: string[] = []
  lines.push(headers.map((h, i) => pad(h, widths[i])).join('  '))
  lines.push(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of rows) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join('  '))
  }
  lines.push('')
  lines.push(
    `Total: ${result.total} | Updated: ${result.updated} | Skipped: ${result.skipped} | Errors: ${result.errors}`,
  )
  return lines
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agencia-backend && pnpm test:int -- update-clients.int.spec.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/scripts/update-clients.ts agencia-backend/tests/int/scripts/update-clients.int.spec.ts
git commit -m "feat(scripts): implement runUpdateAll and formatUpdateAllSummary"
```

---

## Task 9: Wire up `run()` in `update-clients.ts`

**Files:**
- Modify: `agencia-backend/scripts/update-clients.ts`

- [ ] **Step 1: Add `run()` function**

Add to `agencia-backend/scripts/update-clients.ts` (at the end):

```ts
export const run = async (): Promise<void> => {
  let options: UpdateAllOptions
  try {
    options = parseUpdateAllArgs(process.argv.slice(2))
  } catch (err) {
    if ((err as Error).message === 'HELP') {
      console.log(USAGE)
      return
    }
    console.error(`Error: ${(err as Error).message}`)
    console.log(USAGE)
    process.exit(1)
  }

  console.log(
    `[update:clients]${options.apply ? ' APPLY' : ' (dry-run)'}${options.filter === 'outdated' ? ' filter=outdated' : ''}${options.template ? ` template=${options.template}` : ' (auto-detect)'}${options.skipInstall ? ' skip-install' : ''}`,
  )

  const result = await runUpdateAll(options)

  for (const line of formatUpdateAllSummary(result)) {
    console.log(line)
  }

  if (!options.apply) {
    console.log('Run with --apply to apply changes')
  }

  if (result.errors > 0) {
    process.exit(1)
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd agencia-backend && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add agencia-backend/scripts/update-clients.ts
git commit -m "feat(scripts): wire run() entry point in update-clients.ts"
```

---

## Task 10: Add npm scripts to `package.json`

**Files:**
- Modify: `agencia-backend/package.json`

- [ ] **Step 1: Add the new scripts**

Edit `agencia-backend/package.json`. In the `"scripts"` section, add these two lines after `"audit:clients"`:

```json
    "sync:clients": "node scripts/loaders/run-with-css.mjs scripts/sync-clients.ts",
    "update:clients": "node scripts/loaders/run-with-css.mjs scripts/update-clients.ts",
```

Result:

```json
    "audit:clients": "node scripts/loaders/run-with-css.mjs scripts/audit-clients.ts",
    "sync:clients": "node scripts/loaders/run-with-css.mjs scripts/sync-clients.ts",
    "update:clients": "node scripts/loaders/run-with-css.mjs scripts/update-clients.ts",
```

- [ ] **Step 2: Verify the scripts work (dry-run)**

Run: `cd agencia-backend && pnpm sync:clients --filter=outdated`
Expected: list of clients with their status, exit 0 if no errors

- [ ] **Step 3: Run typecheck and full test suite**

Run: `cd agencia-backend && pnpm typecheck && pnpm test:int`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/package.json
git commit -m "feat(scripts): add sync:clients and update:clients npm scripts"
```

---

## Task 11: Update `AGENTS.md` with bulk operations section

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add a new section after the existing "Template → Client Sync" section**

In `AGENTS.md`, after the `### What \`update:client\` merges` table and before the `### Template version tracking` subsection, insert:

```markdown
### Bulk operations: `sync:clients` and `update:clients`

When you want to apply template changes to **all** clients in one shot:

1. Dry-run for everyone: `pnpm sync:clients --filter=outdated` — skips clients that are already up-to-date.
2. Review the summary table. It shows file counts per client and any errors.
3. Apply: `pnpm sync:clients --apply` (or `--apply --filter=outdated` to only touch the outdated ones).
4. Same flow for dependencies: `pnpm update:clients` (dry-run) → `pnpm update:clients --apply`.

Flags for both:

| Flag | Default | Meaning |
|------|---------|---------|
| `--apply` | `false` | Execute the changes. Without it → dry-run. |
| `--filter=outdated` | `all` | Skip clients with zero changes. |
| `--template=astro\|nextjs` | auto | Override the auto-detect from `package.json#name`. |

`update:clients` also accepts `--skip-install` to defer `pnpm install` (useful when you'll batch with other changes).

Exit code is `0` if everything succeeded, `1` if any client errored. Errors don't stop the batch — each client is processed independently and reported in the summary.
```

- [ ] **Step 2: Verify the new section renders correctly**

Run: `grep -A 3 "Bulk operations" AGENTS.md`
Expected: shows the new section header

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): add bulk sync:clients and update:clients workflow"
```

---

## Self-Review

After completing all tasks, run the full quality suite:

- [ ] **Typecheck:** `cd agencia-backend && pnpm typecheck`
- [ ] **Tests:** `cd agencia-backend && pnpm test:int`
- [ ] **Lint:** `cd agencia-backend && pnpm lint`
- [ ] **Format check:** `cd agencia-backend && pnpm prettier --check scripts/sync-clients.ts scripts/update-clients.ts tests/int/scripts/sync-clients.int.spec.ts tests/int/scripts/update-clients.int.spec.ts`
- [ ] **Manual dry-run smoke test:** `cd agencia-backend && pnpm sync:clients --filter=outdated` (verify output format matches spec)
- [ ] **Manual dry-run smoke test:** `cd agencia-backend && pnpm update:clients --filter=outdated` (verify output format matches spec)
