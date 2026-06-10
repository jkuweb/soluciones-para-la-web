import type { CheckboxField, TextField, TextFieldSingleValidation, FieldHook } from 'payload'
import { formatSlugHook } from './formatSlug'

type SafeTextFieldOverrides = Partial<
  Pick<
    TextField,
    'label' | 'required' | 'defaultValue' | 'index' | 'unique' | 'localized' | 'admin'
  >
> & {
  validate?: TextFieldSingleValidation
  hooks?: {
    beforeValidate?: FieldHook[]
    afterChange?: FieldHook[]
    [key: string]: FieldHook[] | undefined
  }
}

type Overrides = {
  slugOverrides?: SafeTextFieldOverrides
  checkboxOverrides?: Partial<CheckboxField>
}

type Slug = (fieldToUse?: string, overrides?: Overrides) => [TextField, CheckboxField]

export const slugField: Slug = (fieldToUse = 'title', overrides = {}) => {
  const { slugOverrides, checkboxOverrides } = overrides
  const safeOverrides = slugOverrides ?? {}

  const checkBoxField: CheckboxField = {
    name: 'slugLock',
    type: 'checkbox',
    defaultValue: true,
    admin: {
      hidden: true,
      position: 'sidebar',
    },
    ...checkboxOverrides,
  }

  const slugField: TextField = {
    name: 'slug',
    type: 'text',
    index: true,
    label: 'Slug',
    required: true,
    ...safeOverrides,
    hooks: {
      ...(safeOverrides.hooks || {}),
      beforeValidate: [...(safeOverrides.hooks?.beforeValidate || []), formatSlugHook(fieldToUse)],
    },
    admin: {
      position: 'sidebar',
      ...(safeOverrides.admin || {}),
      components: {
        ...(safeOverrides.admin?.components || {}),
        Field: {
          path: '@/fields/slug/SlugComponent#SlugComponent',
          clientProps: {
            fieldToUse,
            checkboxFieldPath: checkBoxField.name,
          },
        },
      },
    },
  }

  return [slugField, checkBoxField]
}
