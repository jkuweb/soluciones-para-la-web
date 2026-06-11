import { type Field } from 'payload'
import { link, type LinkAppearances } from './link'

type LinkGroupFieldOptions = {
  /** When true, the label field on individual links will not be rendered */
  disableLabel?: boolean
  /** Override any field properties */
  overrides?: Partial<Field>
  /** Appearance options for each link. Set to false to disable */
  appearances?: LinkAppearances[] | false
}

/**
 * Reusable link group field.
 *
 * Creates an array of link fields, ideal for navigation menus.
 * Each entry in the array is a reusable link with internal/custom type,
 * relationship to pages, new tab, and optional label.
 */
export const linkGroup = ({
  disableLabel = false,
  overrides = {},
  appearances,
}: LinkGroupFieldOptions = {}): Field => {
  const linkGroupField: Field = {
    name: 'links',
    type: 'array',
    admin: {
      initCollapsed: true,
    },
    fields: [
      link({
        disableLabel,
        appearances,
      }),
    ],
  }

  // Apply overrides
  const overridesRecord = overrides as Record<string, unknown>
  const merged = {
    ...linkGroupField,
    ...overridesRecord,
    fields: (overridesRecord.fields as Field[]) ?? linkGroupField.fields,
    admin: {
      ...(linkGroupField.admin as object),
      ...(overridesRecord.admin as object),
    },
  }

  return merged as Field
}
