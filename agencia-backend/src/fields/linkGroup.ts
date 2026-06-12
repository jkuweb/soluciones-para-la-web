import { type Field } from 'payload'
import { link, type LinkAppearances } from './link'
import { deepMerge } from '@/utilities/deepMerge'

type LinkGroupFieldOptions = {
  /** When true, the label field on individual links will not be rendered */
  disableLabel?: boolean
  /** Override any field properties */
  overrides?: Partial<Field>
  /** Appearance options for each link. Set to false to disable */
  appearances?: LinkAppearances[] | false
  /** Field name (default: 'links') */
  name?: string
  /** Field label (default: 'Links') */
  label?: string
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
  name = 'links',
  label = 'Links',
}: LinkGroupFieldOptions = {}): Field => {
  const linkGroupField: Field = {
    name,
    label,
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

  return deepMerge(linkGroupField, overrides as Record<string, unknown>) as Field
}
