import type { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.roles?.includes('super-admin')) return true
      return { id: { in: user?.tenants?.map((t) => {
        const tenant = t.tenant
        if (typeof tenant === 'string') return tenant
        if (typeof tenant === 'number') return String(tenant)
        return tenant.id
      }) } }
    },
    create: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    update: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    delete: ({ req: { user } }) => {
      return user?.roles?.includes('super-admin') ?? false
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
    },
    {
      name: 'serviceType',
      type: 'select',
      options: [
        { label: 'Web Estática', value: 'web-estatica' },
        { label: 'Tienda Online', value: 'tienda-online' },
        { label: 'Academia Online', value: 'academia-online' },
      ],
      required: true,
    },
    {
      name: 'frontendType',
      type: 'select',
      options: [
        { label: 'Astro', value: 'astro' },
        { label: 'Next.js', value: 'nextjs' },
      ],
      required: true,
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
      required: true,
    },
    {
      name: 'maintenanceFee',
      type: 'number',
      label: 'Cuota de mantenimiento (€)',
    },
    {
      name: 'projectPrice',
      type: 'number',
      label: 'Presupuesto total (€)',
    },
    {
      name: 'paymentStatus',
      type: 'select',
      options: [
        { label: '50% Inicial', value: 'initial-paid' },
        { label: '100% Pagado', value: 'fully-paid' },
      ],
    },
  ],
}
