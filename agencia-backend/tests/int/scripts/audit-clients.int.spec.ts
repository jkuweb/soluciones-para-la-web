import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseAuditArgs,
  listClientSlugs,
  formatAuditTable,
  formatAuditJson,
  auditClient,
  type AuditReport,
} from '../../../scripts/audit-clients'
import { getAllowlist, getTemplateDir } from '../../../scripts/sync-template'

vi.mock('@clack/prompts', () => ({
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const MONOREPO_ROOT = '/home/joseba/Clientes/agencia'
const ASTRO_TEMPLATE = join(MONOREPO_ROOT, 'astro-starter')
const NEXTJS_TEMPLATE = join(MONOREPO_ROOT, 'nextjs-starter')

/**
 * Build a fake client directory under `root` that mirrors a real template (astro
 * or nextjs). Copies the allowlisted files verbatim so a dry-run sync reports
 * zero changes, plus matching .template-version.json and package.json.
 */
const setupClientFromTemplate = (
  root: string,
  templateType: 'astro' | 'nextjs',
): { clientDir: string; templateVersion: string } => {
  const clientDir = join(root, 'client')
  mkdirSync(clientDir, { recursive: true })

  const templateDir = templateType === 'astro' ? ASTRO_TEMPLATE : NEXTJS_TEMPLATE
  const templatePkg = JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf-8'))
  const templateVersion: string = templatePkg.version

  // Mirror the template's package.json so detectTemplateType + mergePackageJson
  // both report no changes.
  writeFileSync(join(clientDir, 'package.json'), JSON.stringify(templatePkg, null, 2))

  // Copy every allowlisted file from the template.
  for (const relPath of getAllowlist(templateType)) {
    const src = join(templateDir, relPath)
    const dest = join(clientDir, relPath)
    mkdirSync(join(dest, '..'), { recursive: true })
    copyFileSync(src, dest)
  }

  // Matching .template-version.json so the version check passes.
  writeFileSync(
    join(clientDir, '.template-version.json'),
    JSON.stringify(
      { template: templateType, version: templateVersion, installedAt: '2026-01-01T00:00:00Z' },
      null,
      2,
    ),
  )

  return { clientDir, templateVersion }
}

describe('parseAuditArgs', () => {
  it('returns defaults when no args are given', () => {
    const opts = parseAuditArgs([])
    expect(opts).toEqual({ json: false, filter: 'all' })
    expect(opts.slug).toBeUndefined()
  })

  it('parses --slug, --json, and --filter', () => {
    const opts = parseAuditArgs(['--slug=cliente-x', '--json', '--filter=outdated'])
    expect(opts).toEqual({ slug: 'cliente-x', json: true, filter: 'outdated' })
  })

  it('rejects invalid --filter value', () => {
    expect(() => parseAuditArgs(['--filter=foo'])).toThrow(/Invalid --filter/)
  })

  it('rejects invalid slug', () => {
    expect(() => parseAuditArgs(['--slug=BAD slug'])).toThrow(/Invalid slug/)
  })

  it('rejects unknown arguments', () => {
    expect(() => parseAuditArgs(['--weird'])).toThrow(/Unknown argument/)
  })
})

describe('listClientSlugs', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'audit-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns sorted slugs that match SLUG_REGEX and are directories', async () => {
    mkdirSync(join(root, 'cliente-a'))
    mkdirSync(join(root, 'cliente-b'))
    writeFileSync(join(root, 'not-a-dir.txt'), '') // should be ignored
    mkdirSync(join(root, 'BAD slug')) // should be ignored (doesn't match SLUG_REGEX)

    const slugs = await listClientSlugs(root)
    expect(slugs).toEqual(['cliente-a', 'cliente-b'])
  })

  it('returns empty array when clients dir does not exist', async () => {
    const slugs = await listClientSlugs(join(root, 'nope'))
    expect(slugs).toEqual([])
  })
})

describe('formatAuditTable', () => {
  const baseReport: AuditReport = {
    generatedAt: '2026-06-18T00:00:00Z',
    clients: [
      {
        slug: 'cliente-a',
        templateType: 'astro',
        templateVersion: '1.0.1',
        clientTemplateVersion: '1.0.1',
        filesChanged: 0,
        filesAdded: 0,
        pkgChanges: 0,
        status: 'up-to-date',
      },
    ],
    summary: { total: 1, upToDate: 1, outOfDate: 0, errors: 0 },
  }

  it('includes header, divider, and a summary line', () => {
    const lines = formatAuditTable(baseReport)
    expect(lines[0]).toMatch(/Client.*Template.*Files.*Pkg.*TemplateVer.*Status/)
    expect(lines[1]).toMatch(/----/)
    expect(lines.some((l) => l.includes('cliente-a'))).toBe(true)
    expect(lines.some((l) => l.includes('Total: 1 | Up-to-date: 1'))).toBe(true)
  })

  it('shows version mismatch as "X (→ Y)"', () => {
    const report: AuditReport = {
      ...baseReport,
      clients: [
        {
          ...baseReport.clients[0],
          clientTemplateVersion: '1.0.0',
          templateVersion: '1.0.1',
          status: 'out-of-date',
        },
      ],
      summary: { total: 1, upToDate: 0, outOfDate: 1, errors: 0 },
    }
    const lines = formatAuditTable(report)
    expect(lines.some((l) => l.includes('1.0.0 (→ 1.0.1)'))).toBe(true)
  })

  it('includes the reason when status is error', () => {
    const report: AuditReport = {
      ...baseReport,
      clients: [
        {
          slug: 'broken',
          templateType: null,
          templateVersion: null,
          clientTemplateVersion: null,
          filesChanged: 0,
          filesAdded: 0,
          pkgChanges: 0,
          status: 'error',
          reason: 'package.json missing',
        },
      ],
      summary: { total: 1, upToDate: 0, outOfDate: 0, errors: 1 },
    }
    const lines = formatAuditTable(report)
    expect(lines.some((l) => l.includes('error') && l.includes('package.json missing'))).toBe(true)
  })
})

describe('formatAuditJson', () => {
  it('returns valid JSON ending with a newline', () => {
    const report: AuditReport = {
      generatedAt: '2026-06-18T00:00:00Z',
      clients: [],
      summary: { total: 0, upToDate: 0, outOfDate: 0, errors: 0 },
    }
    const out = formatAuditJson(report)
    expect(out.endsWith('\n')).toBe(true)
    expect(JSON.parse(out)).toEqual(report)
  })
})

describe('auditClient', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'audit-client-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns error when client dir does not exist', async () => {
    const result = await auditClient('nope', join(root, 'missing'))
    expect(result.status).toBe('error')
    expect(result.reason).toMatch(/does not exist/)
  })

  it('returns error when package.json is missing or has unknown name', async () => {
    const dir = join(root, 'no-pkg')
    mkdirSync(dir, { recursive: true })
    const result = await auditClient('no-pkg', dir)
    expect(result.status).toBe('error')
    expect(result.reason).toMatch(/Cannot detect template type/)
  })

  it('reports up-to-date when client mirrors the template (astro)', async () => {
    const { clientDir, templateVersion } = setupClientFromTemplate(root, 'astro')
    const result = await auditClient('test-client', clientDir)
    expect(result.status).toBe('up-to-date')
    expect(result.templateType).toBe('astro')
    expect(result.templateVersion).toBe(templateVersion)
    expect(result.clientTemplateVersion).toBe(templateVersion)
    expect(result.filesChanged).toBe(0)
    expect(result.filesAdded).toBe(0)
    expect(result.pkgChanges).toBe(0)
  })

  it('reports out-of-date when an allowlisted file differs from the template', async () => {
    const { clientDir } = setupClientFromTemplate(root, 'astro')
    // Modify astro.config.mjs in the client
    writeFileSync(join(clientDir, 'astro.config.mjs'), '// changed\n')

    const result = await auditClient('test-client', clientDir)
    expect(result.status).toBe('out-of-date')
    expect(result.filesChanged).toBe(1)
  })

  it('reports out-of-date when package.json has client-only dependencies', async () => {
    const { clientDir } = setupClientFromTemplate(root, 'astro')
    // Add a client-only dependency
    const pkg = JSON.parse(readFileSync(join(clientDir, 'package.json'), 'utf-8'))
    pkg.dependencies = { ...pkg.dependencies, 'client-extra': '^1.0.0' }
    writeFileSync(join(clientDir, 'package.json'), JSON.stringify(pkg, null, 2))

    const result = await auditClient('test-client', clientDir)
    expect(result.status).toBe('out-of-date')
    expect(result.pkgChanges).toBe(1)
  })

  it('reports out-of-date when .template-version.json is behind the template', async () => {
    const { clientDir, templateVersion } = setupClientFromTemplate(root, 'astro')
    const meta = JSON.parse(readFileSync(join(clientDir, '.template-version.json'), 'utf-8'))
    meta.version = '0.9.0' // pretend we're behind
    writeFileSync(join(clientDir, '.template-version.json'), JSON.stringify(meta, null, 2))

    const result = await auditClient('test-client', clientDir)
    expect(result.status).toBe('out-of-date')
    expect(result.templateVersion).toBe(templateVersion)
    expect(result.clientTemplateVersion).toBe('0.9.0')
  })
})
