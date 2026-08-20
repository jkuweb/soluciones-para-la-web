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
