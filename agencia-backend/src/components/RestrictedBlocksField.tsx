'use client'

import { useAuth, BlocksField } from '@payloadcms/ui'
import React from 'react'
import './RestrictedBlocksField.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RestrictedBlocksField: React.FC<any> = (props) => {
  const { user } = useAuth()
  const isRestricted = !user?.roles?.includes('super-admin')

  return (
    <div
      className={`restricted-blocks-field ${isRestricted ? 'restricted-blocks-field--tenant-admin' : ''}`}
    >
      {isRestricted && (
        <div className="restricted-blocks-field__banner">
          La estructura de la página solo puede ser modificada por un super-admin.
          Puedes editar el contenido de los bloques existentes.
        </div>
      )}
      <BlocksField {...props} />
    </div>
  )
}

export default RestrictedBlocksField
