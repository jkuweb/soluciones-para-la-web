import type { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    group: 'Multi-Tenant',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
      label: 'Domain',
    },
    {
      name: 'serviceType',
      type: 'select',
      options: [
        { label: 'Web Estática', value: 'web-estatica' },
        { label: 'Tienda Online', value: 'tienda-online' },
        { label: 'Academia Online', value: 'academia-online' },
      ],
      label: 'Service Type',
    },
    {
      name: 'frontendType',
      type: 'select',
      options: [
        { label: 'Astro', value: 'astro' },
        { label: 'Next.js', value: 'nextjs' },
      ],
      label: 'Frontend Type',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Activo', value: 'active' },
        { label: 'Pendiente', value: 'pending' },
        { label: 'Suspendido', value: 'suspended' },
      ],
      defaultValue: 'pending',
      label: 'Status',
    },
    {
      name: 'maintenanceFee',
      type: 'number',
      label: 'Maintenance Fee (€)',
    },
    {
      name: 'projectPrice',
      type: 'number',
      label: 'Project Price (€)',
    },
    {
      name: 'paymentStatus',
      type: 'select',
      options: [
        { label: '50% Inicial', value: 'initial-paid' },
        { label: '100% Pagado', value: 'fully-paid' },
      ],
      label: 'Payment Status',
    },
  ],
}
