import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type TemplateVersion = {
  template: string
  version: string
}

export type TemplateVersionFile = TemplateVersion & {
  installedAt: string
}

export const TEMPLATE_VERSION_FILENAME = '.template-version.json'

export const readTemplateVersion = async (templateDir: string): Promise<TemplateVersion> => {
  const pkgPath = path.join(templateDir, 'package.json')
  const raw = await readFile(pkgPath, 'utf-8')
  const parsed: unknown = JSON.parse(raw)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { name?: unknown }).name !== 'string' ||
    typeof (parsed as { version?: unknown }).version !== 'string'
  ) {
    throw new Error(`Template package.json at ${pkgPath} is missing name or version`)
  }
  const pkg = parsed as { name: string; version: string }
  const template = pkg.name.replace(/-starter$/u, '')
  return { template, version: pkg.version }
}

export const writeTemplateVersionFile = async (
  destDir: string,
  info: { template: string; version: string; installedAt?: string },
): Promise<void> => {
  const filePath = path.join(destDir, TEMPLATE_VERSION_FILENAME)
  const data: TemplateVersionFile = {
    template: info.template,
    version: info.version,
    installedAt: info.installedAt ?? new Date().toISOString(),
  }
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}
