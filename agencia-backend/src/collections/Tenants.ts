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
      name: 'devUrl',
      type: 'text',
      label: 'URL de desarrollo local',
      admin: {
        description:
          'URL del starter corriendo en local (ej: http://localhost:4321). Tiene prioridad sobre domain y LIVE_PREVIEW_BASE_URL para el live preview del admin.',
      },
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
    {
      name: 'blogEnabled',
      type: 'checkbox',
      label: 'Blog activado',
      defaultValue: false,
      admin: {
        description:
          'Permite al cliente crear y gestionar sus posts, categorías y etiquetas. Si está desactivado, el cliente no ve contenido del blog vía API y no puede escribir desde el admin.',
        position: 'sidebar',
      },
      access: {
        // Solo super-admin puede togglear este flag.
        // `read` queda en default (visible a usuarios autenticados para
        // que el admin cliente lo vea, aunque sea solo lectura).
        create: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
        update: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'ecommerceTier',
      type: 'select',
      options: [
        { label: 'Sin ecommerce', value: 'none' },
        { label: 'Lite (catálogo + Stripe)', value: 'lite' },
        { label: 'Standard (+ envíos + cupones)', value: 'standard' },
        { label: 'Full (+ reviews + wishlist + taxes)', value: 'full' },
      ],
      defaultValue: 'none',
      required: true,
      admin: {
        position: 'sidebar',
        description:
          'Pack inicial de ecommerce. Modificarlo no agrega features automáticamente — usá `pnpm add-feature` o editá `features` directo.',
      },
      access: {
        create: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
        update: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'features',
      type: 'json',
      defaultValue: {
        catalog: false,
        payments: false,
        shipping: false,
        coupons: false,
        reviews: false,
        wishlist: false,
        taxes: false,
        abandonedCart: false,
        subscriptions: false,
      },
      admin: {
        position: 'sidebar',
        description:
          'Flags individuales de cada feature. Para extender: `pnpm add-feature <feature> --slug=<cliente>`.',
      },
      access: {
        read: () => true,
        create: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
        update: ({ req: { user } }) => user?.roles?.includes('super-admin') ?? false,
      },
    },
  ],
}
