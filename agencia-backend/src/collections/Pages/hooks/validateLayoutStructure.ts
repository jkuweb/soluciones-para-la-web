import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

const STRUCTURAL_CHANGE_MSG =
  'Page structure changes are restricted to super-admin users. You cannot add, remove, or reorder blocks.'

function assertNoStructuralChange(
  originalBlocks: Array<{ id?: string | null; blockType: string }> | undefined | null,
  newBlocks: Array<{ id?: string | null; blockType: string }> | undefined | null,
): void {
  // Both absent → pass (nothing to protect)
  if (!originalBlocks && !newBlocks) {
    return
  }

  // One side has blocks, the other doesn't → structural change
  if (!originalBlocks || !newBlocks) {
    throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
  }

  // Block count differs → structural change
  if (originalBlocks.length !== newBlocks.length) {
    throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
  }

  // Check each block: id and blockType must match at the same position
  for (let i = 0; i < originalBlocks.length; i++) {
    if (originalBlocks[i].id !== newBlocks[i].id) {
      throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
    }
    if (originalBlocks[i].blockType !== newBlocks[i].blockType) {
      throw new APIError(STRUCTURAL_CHANGE_MSG, 400)
    }
  }
}

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

  const recordData = data as Record<string, unknown>
  const recordOriginal = originalDoc as Record<string, unknown>

  // Validate layout changes
  if ('layout' in recordData) {
    const originalLayout = recordOriginal.layout as
      | Array<{ id?: string | null; blockType: string }>
      | undefined
      | null

    const newLayout = recordData.layout as
      | Array<{ id?: string | null; blockType: string }>
      | undefined
      | null

    assertNoStructuralChange(originalLayout, newLayout)
  }

  // Validate hero changes
  if ('hero' in recordData) {
    const originalHero = recordOriginal.hero as
      | Array<{ id?: string | null; blockType: string }>
      | undefined
      | null

    const newHero = recordData.hero as
      | Array<{ id?: string | null; blockType: string }>
      | undefined
      | null

    assertNoStructuralChange(originalHero, newHero)
  }
}
