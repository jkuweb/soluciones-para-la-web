import { type Field } from 'payload'

type LinkFieldOptions = {
  /** When true, the label field will not be rendered */
  disableLabel?: boolean
  /** Override any field properties */
  overrides?: Partial<Field>
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
 *
 * No appearance/styling options — this is a pure link field.
 */
export const link = ({
  disableLabel = false,
  overrides = {},
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
