import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

export const validateLayoutStructure: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  const { user } = req

  // Super-admin bypasses all validation
  if (user?.roles?.includes('super-admin')) {
    return
  }

  // Create operations: already restricted to super-admin by Pages access control.
  // No originalDoc to compare, so skip.
  if (operation === 'create' || !originalDoc) {
    return
  }

  // If layout is not part of this update at all, skip validation.
  // This allows metadata-only updates (title, status) without layout.
  if (!('layout' in (data as Record<string, unknown>))) {
    return
  }

  const STRUCTURAL_CHANGE_MSG =
    'Page structure changes are restricted to super-admin users. You cannot add, remove, or reorder blocks.'

  const originalLayout = (originalDoc as Record<string, unknown>).layout as
    | Array<{ id?: string | null; blockType: string }>
    | undefined
    | null

  const newLayout = (data as Record<string, unknown>).layout as
    | Array<{ id?: string | null; blockType: string }>
    | undefined
    | null

  // Both absent → pass (nothing to protect)
  if (!originalLayout && !newLayout) {
    return
  }

  // One side has blocks, the other doesn't → structural change
  if (!originalLayout || !newLayout) {
    throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
  }

  // Block count differs → structural change
  if (originalLayout.length !== newLayout.length) {
    throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
  }

  // Check each block: id and blockType must match at the same position
  for (let i = 0; i < originalLayout.length; i++) {
    if (originalLayout[i].id !== newLayout[i].id) {
      throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
    }
    if (originalLayout[i].blockType !== newLayout[i].blockType) {
      throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
    }
  }

  // Content-only edits pass validation
}
