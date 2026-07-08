'use client'

import { Header } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'
import React from 'react'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Header['navItems']>[number]>()

  const title = data?.data?.title
  const label = title
    ? `Nav item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${title}`
    : 'Row'

  return <div>{label}</div>
}
