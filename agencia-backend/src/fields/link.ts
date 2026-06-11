import { type Field, type GroupField } from 'payload'

export type LinkAppearances = 'default' | 'outline'

export const appearanceOptions: Record<
  LinkAppearances,
  { label: string; value: string }
> = {
  default: {
    label: 'Default',
    value: 'default',
  },
  outline: {
    label: 'Outline',
    value: 'outline',
  },
}

type LinkFieldOptions = {
  /** When true, the label field will not be rendered */
  disableLabel?: boolean
  /** Override any field properties */
  overrides?: Partial<GroupField>
  /** Appearance options. Set to false to disable */
  appearances?: LinkAppearances[] | false
}

/**
 * Reusable link field based on Payload CMS official template.
 *
 * Creates a group field with:
 * - type: radio (reference | custom)
 * - newTab: checkbox
 * - reference: relationship to pages (conditional on type === 'reference')
 * - url: text (conditional on type === 'custom')
 * - label: text (optional, can be disabled)
 * - appearance: select (optional, can be disabled with appearances: false)
 */
export const link = ({
  disableLabel = false,
  overrides = {},
  appearances,
}: LinkFieldOptions = {}): Field => {
  const linkFields: Field[] = [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'radio',
          options: [
            {
              label: 'Internal Link',
              value: 'reference',
            },
            {
              label: 'Custom URL',
              value: 'custom',
            },
          ],
          defaultValue: 'reference',
          admin: {
            layout: 'horizontal',
            width: '50%',
          },
        },
        {
          name: 'newTab',
          type: 'checkbox',
          label: 'Open in new tab',
          admin: {
            width: '50%',
            style: {
              alignSelf: 'flex-end',
            },
          },
        },
      ],
    },
    {
      name: 'reference',
      type: 'relationship',
      relationTo: ['pages'],
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'reference',
      },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'custom',
      },
    },
  ]

  if (!disableLabel) {
    linkFields.push({
      name: 'label',
      type: 'text',
      required: true,
    })
  }

  if (appearances !== false) {
    let appearanceOptionsToUse = [
      appearanceOptions.default,
      appearanceOptions.outline,
    ]

    if (appearances) {
      appearanceOptionsToUse = appearances.map(
        (appearance) => appearanceOptions[appearance],
      )
    }

    linkFields.push({
      name: 'appearance',
      type: 'select',
      admin: {
        description: 'Choose how the link should be rendered.',
      },
      defaultValue: 'default',
      options: appearanceOptionsToUse,
    })
  }

  const linkField: Field = {
    name: 'link',
    type: 'group',
    admin: {
      hideGutter: true,
    },
    fields: linkFields,
  }

  // Apply overrides
  const overridesRecord = overrides as Record<string, unknown>
  const merged = {
    ...linkField,
    ...overridesRecord,
    fields: (overridesRecord.fields as Field[]) ?? linkField.fields,
    admin: {
      ...(linkField.admin as object),
      ...(overridesRecord.admin as object),
    },
  }

  return merged as Field
}
