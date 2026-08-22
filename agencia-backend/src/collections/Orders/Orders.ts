import type { CollectionConfig } from 'payload'

import { ordersTenantAccess } from './access'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'customerEmail', 'status', 'subtotal', 'currency', 'createdAt'],
    group: 'Tienda',
    description: 'Órdenes generadas por checkout. Snapshot inmutable de items.',
  },
  access: {
    read: ordersTenantAccess,
    create: ordersTenantAccess,
    update: ordersTenantAccess,
    delete: ordersTenantAccess,
  },
  fields: [
    {
      name: 'customerEmail',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Item',
        plural: 'Items',
      },
      fields: [
        {
          name: 'productId',
          type: 'text',
          required: true,
          admin: { description: 'ID del Product en el momento del checkout.' },
        },
        {
          name: 'variantId',
          type: 'text',
          required: false,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Precio unitario en centavos (evita floats).' },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'imageUrl',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      min: 0,
      admin: { description: 'Suma de unitPrice * quantity, en centavos.' },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      admin: { description: 'ISO 4217 (ej: "USD", "EUR", "ARS").' },
    },
    {
      name: 'stripeSessionId',
      type: 'text',
      required: false,
      index: true,
      admin: { description: 'cs_... de Stripe Checkout. Único por sesión.' },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      required: false,
      admin: { description: 'pi_... confirmado en el webhook.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'failedReason',
      type: 'text',
      required: false,
    },
    {
      name: 'paidAt',
      type: 'date',
      required: false,
    },
  ],
  timestamps: true,
}
