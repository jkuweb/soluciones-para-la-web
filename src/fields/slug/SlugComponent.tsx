'use client'
import React, { useCallback } from 'react'
import type { TextFieldClientProps } from 'payload'
import { useField, Button, TextInput, FieldLabel, useFormFields, useForm } from '@payloadcms/ui'
import { formatSlug } from './formatSlug'
import './index.css'

type SlugComponentProps = TextFieldClientProps & {
  fieldToUse: string
  checkboxFieldPath: string
}

export const SlugComponent: React.FC<SlugComponentProps> = (props) => {
  const {
    field,
    path,
    readOnly: readOnlyFromProps,
    fieldToUse,
    checkboxFieldPath: checkboxFieldPathFromProps,
  } = props

  const { label } = field
  const fieldPath = path || field.name
  const checkboxFieldPath = fieldPath?.includes('.')
    ? `${fieldPath}.${checkboxFieldPathFromProps}`
    : checkboxFieldPathFromProps

  const { value, setValue } = useField<string>({ path: fieldPath })
  const { dispatchFields, getDataByPath } = useForm()
  const isLocked = useFormFields(([fields]) => fields[checkboxFieldPath]?.value as boolean)

  const handleGenerate = useCallback(
    (e: React.MouseEvent<Element>) => {
      e.preventDefault()
      const targetFieldValue = getDataByPath(fieldToUse) as string
      if (targetFieldValue) {
        const formattedSlug = formatSlug(targetFieldValue)
        if (value !== formattedSlug) setValue(formattedSlug)
      } else {
        if (value !== '') setValue('')
      }
    },
    [setValue, value, fieldToUse, getDataByPath],
  )

  const handleLock = useCallback(
    (e: React.MouseEvent<Element>) => {
      e.preventDefault()
      dispatchFields({
        type: 'UPDATE',
        path: checkboxFieldPath,
        value: !isLocked,
      })
    },
    [isLocked, checkboxFieldPath, dispatchFields],
  )

  if (!fieldToUse || !checkboxFieldPathFromProps) {
    console.error('SlugComponent requires fieldToUse and checkboxFieldPath in clientProps')
    return <div style={{ color: 'red' }}>Missing required props</div>
  }

  return (
    <div className="field-type slug-field-component">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`field-${fieldPath}`} label={label} />
        {!isLocked && (
          <Button className="lock-button" buttonStyle="none" onClick={handleGenerate}>
            Generate
          </Button>
        )}
        <Button className="lock-button" buttonStyle="none" onClick={handleLock}>
          {isLocked ? 'Unlock' : 'Lock'}
        </Button>
      </div>
      <TextInput
        value={value}
        onChange={setValue}
        path={fieldPath}
        readOnly={Boolean(readOnlyFromProps || isLocked)}
      />
    </div>
  )
}
