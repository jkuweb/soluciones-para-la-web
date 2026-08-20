import type { FeatureInstallContext, FeatureInstallResult } from './types'

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
