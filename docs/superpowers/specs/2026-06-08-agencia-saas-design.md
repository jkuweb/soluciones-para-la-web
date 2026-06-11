# Agencia SaaS — Diseño de Arquitectura

**Fecha:** 2026-06-08
**Autor:** Joseba
**Estado:** Aprobado

---

## 1. Visión General

Plataforma para agencia de desarrollo web donde el programador (super-admin) gestiona múltiples clientes desde un único panel. Cada cliente tiene su propia web independiente con dominio propio, y solo puede editar el contenido (texto, imágenes) de lo que el programador ya ha creado.

**No es un SaaS con planes de suscripción.** Es un servicio de desarrollo a medida con mantenimiento mensual.

**Modelo de negocio:**
- Presupuesto cerrado por proyecto (50% al inicio, 50% al final)
- Mantenimiento mensual recurrente (€29-149/mes según tipo de web)
- Cada proyecto es único y a medida

---

## 2. Arquitectura de Alto Nivel

### 2.1 Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Backend / CMS** | Payload CMS + PostgreSQL | Multi-tenant nativo, tipado fuerte, API REST/GraphQL |
| **Frontend Webs Estáticas** | Astro | Rendimiento óptimo, generación estática, SEO-friendly |
| **Frontend Tiendas/Academias** | Next.js | SSR, ISR, API routes, live preview, e-commerce dinámico |
| **Multi-tenancy** | `@payloadcms/plugin-multi-tenant` | Aislamiento de datos, filtrado por tenant, roles |
| **CSS** | Vanilla CSS / CSS Modules / SCSS | Sin Tailwind. Control total del diseño por proyecto. |
| **Pagos / Facturación** | Stripe (externo) | Pagos, facturación, suscripciones de mantenimiento |
| **CRM / Gestión** | Notion / Airtable (externo) | Lista de clientes, proyectos, estado de pagos |
| **Deploy** | Vercel / Netlify | CI/CD automático, dominios custom, edge CDN |

### 2.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    tuagencia.com (TU WEB)                    │
│  • Frontend: Astro/Next.js (hecho a mano, sin Payload)     │
│  • Landing page de servicios                                │
│  • Formulario de contacto → Notion/CRM                      │
│  • Blog de la agencia (opcional)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PAYLOAD CMS (Backend multi-tenant)               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Tenant: "mi-agencia" (tuagencia.com)                     ││
│  │   • Placeholder en BD. No usado para frontend.           ││
│  └─────────────────────────────────────────────────────────┘│
  │  ┌─────────────────────────────────────────────────────────┐│
  │  │ Tenant: "cliente-ejemplo" (cliente-ejemplo.com)           ││
  │  │   • Pages: Inicio, Servicios, Contacto                   ││
  │  │   • Frontend: Astro (web estática)                       ││
  │  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Tenant: "tienda-moda" (tiendademoda.com)                ││
│  │   • Pages: Inicio, Catálogo, Producto, Carrito, Checkout ││
│  │   • Frontend: Next.js (tienda online)                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMAS EXTERNOS (Opción A)                   │
│  • Stripe: Pagos (50% inicial, 50% final, mantenimiento)     │
│  • Notion/Airtable: CRM, lista de clientes, proyectos      │
│  • Email: Notificaciones, accesos, facturas                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Estructura de Payload CMS

### 3.1 Colecciones

#### `Tenants`

```typescript
{
  name: 'Tenants',
  fields: [
    { name: 'name', type: 'text', required: true },        // "Cliente Ejemplo"
    { name: 'slug', type: 'text', required: true },        // "cliente-ejemplo"
    { name: 'domain', type: 'text', required: true },      // "cliente-ejemplo.com"
    { name: 'serviceType', type: 'select', options: [
      { label: 'Web Estática', value: 'web-estatica' },
      { label: 'Tienda Online', value: 'tienda-online' },
      { label: 'Academia Online', value: 'academia-online' },
    ]},
    { name: 'frontendType', type: 'select', options: [
      { label: 'Astro', value: 'astro' },
      { label: 'Next.js', value: 'nextjs' },
    ]},
    { name: 'status', type: 'select', options: [
      { label: 'Activo', value: 'active' },
      { label: 'Pendiente', value: 'pending' },
      { label: 'Suspendido', value: 'suspended' },
    ]},
    { name: 'maintenanceFee', type: 'number' },            // €29, €79, €99...
    { name: 'projectPrice', type: 'number' },               // Presupuesto total
    { name: 'paymentStatus', type: 'select', options: [
      { label: '50% Inicial', value: 'initial-paid' },
      { label: '100% Pagado', value: 'fully-paid' },
    ]},
  ]
}
```

#### `Users`

```typescript
{
  name: 'Users',
  auth: true,
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'name', type: 'text' },
    // El plugin multi-tenant agrega automáticamente:
    // - tenants: array de { tenant: relationship, roles: ['admin' | 'editor'] }
    // - roles globales: ['super-admin']
  ]
}
```

#### `Pages`

```typescript
{
  name: 'Pages',
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'title', type: 'text', required: true },
    { name: 'layout', type: 'blocks', blocks: [
      // Bloques definidos por el programador según el tipo de web
      'HeroBlock',
      'TextBlock',
      'ImageBlock',
      'ContactBlock',
      'MenuBlock',
      'ProductBlock',
      'CartBlock',
      'CourseBlock',
      'FooterBlock',
    ]},
    { name: 'status', type: 'select', options: [
      { label: 'Borrador', value: 'draft' },
      { label: 'Publicado', value: 'published' },
    ]},
    { name: 'meta', type: 'group', fields: [
      { name: 'title', type: 'text' },
      { name: 'description', type: 'textarea' },
      { name: 'ogImage', type: 'upload', relationTo: 'media' },
    ]},
  ]
}
```

#### `Media`

```typescript
{
  name: 'Media',
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
    { name: 'alt', type: 'text' },
    { name: 'filename', type: 'text' },
    { name: 'mimeType', type: 'text' },
    { name: 'filesize', type: 'number' },
    { name: 'url', type: 'text' },
  ],
  upload: {
    // Validación de archivos
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    // Image resizing
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 1024, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Validación adicional: no permitir archivos ejecutables
        const forbiddenExtensions = ['.exe', '.bat', '.sh', '.php', '.js'];
        if (forbiddenExtensions.some(ext => data.filename?.toLowerCase().endsWith(ext))) {
          throw new Error('Tipo de archivo no permitido');
        }
        return data;
      },
    ],
  },
}
```

**Validaciones de archivos:**
- **MIME types permitidos**: Solo imágenes (JPEG, PNG, GIF, WebP). SVG requiere sanitización adicional.
- **Tamaño máximo**: 5MB por archivo
- **Extensiones prohibidas**: `.exe`, `.bat`, `.sh`, `.php`, `.js` (previene subida de ejecutables)
- **Image resizing**: Payload genera automáticamente thumbnails para optimizar carga

**⚠️ Nota sobre SVG:** Si se permite SVG en el futuro, implementar sanitización con DOMPurify en el servidor y Content-Security-Policy en el frontend para prevenir XSS.

### 3.2 Bloques de Layout (Reutilizables)

Cada bloque es un componente de Payload que define qué campos puede editar el cliente.

```typescript
// HeroBlock
const HeroBlock = {
  slug: 'hero',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'subtitle', type: 'text' },
    { name: 'backgroundImage', type: 'upload', relationTo: 'media' },
    { name: 'ctaText', type: 'text' },
    { name: 'ctaLink', type: 'text' },
  ]
}

// TextBlock
const TextBlock = {
  slug: 'text',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'content', type: 'richText' },
  ]
}

// ImageBlock
const ImageBlock = {
  slug: 'image',
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text' },
  ]
}

// ContactBlock
const ContactBlock = {
  slug: 'contact',
  fields: [
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'address', type: 'textarea' },
    { name: 'mapUrl', type: 'text' },
  ]
}

// MenuBlock (para negocios con carta/menú)
const MenuBlock = {
  slug: 'menu',
  fields: [
    { name: 'category', type: 'text' },
    { name: 'items', type: 'array', fields: [
      { name: 'name', type: 'text' },
      { name: 'description', type: 'textarea' },
      { name: 'price', type: 'number' },
      { name: 'image', type: 'upload', relationTo: 'media' },
    ]},
  ]
}

// ProductBlock (para tiendas)
const ProductBlock = {
  slug: 'product',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    { name: 'price', type: 'number', required: true },
    { name: 'images', type: 'array', fields: [
      { name: 'image', type: 'upload', relationTo: 'media' },
    ]},
    { name: 'stock', type: 'number' },
    { name: 'category', type: 'text' },
  ]
}

// CartBlock (para tiendas)
const CartBlock = {
  slug: 'cart',
  fields: [
    { name: 'emptyMessage', type: 'text' },
    { name: 'checkoutButton', type: 'text' },
  ]
}

// CourseBlock (para academias)
const CourseBlock = {
  slug: 'course',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    { name: 'price', type: 'number' },
    { name: 'duration', type: 'text' },
    { name: 'lessons', type: 'array', fields: [
      { name: 'title', type: 'text' },
      { name: 'videoUrl', type: 'text' },
      { name: 'description', type: 'textarea' },
    ]},
  ]
}

// FooterBlock
const FooterBlock = {
  slug: 'footer',
  fields: [
    { name: 'copyright', type: 'text' },
    { name: 'socialLinks', type: 'array', fields: [
      { name: 'platform', type: 'text' },
      { name: 'url', type: 'text' },
    ]},
  ]
}
```

### 3.3 Permisos (Access Control)

```typescript
// Super-Admin (programador)
const superAdminAccess = {
  tenants: { read: true, create: true, update: true, delete: true },
  pages: { read: true, create: true, update: true, delete: true },
  media: { read: true, create: true, update: true, delete: true },
  users: { read: true, create: true, update: true, delete: true },
}

// Cliente (tenant-admin o tenant-editor)
const clientAccess = {
  tenants: { read: false, create: false, update: false, delete: false },
  pages: {
    read: true,      // Ve SOLO sus páginas
    create: false,   // NO crea nuevas
    update: true,    // Sí edita contenido
    delete: false,   // NO borra
  },
  media: {
    read: true,
    create: true,      // Sí sube/reemplaza imágenes
    update: false,
    delete: false,
  },
  users: {
    read: true,        // Ve solo su perfil
    create: false,
    update: true,      // Puede editar su perfil
    delete: false,
  },
}
```

**Nota:** El plugin multi-tenant aplica automáticamente `baseFilter` para que el cliente solo vea documentos de su tenant.

---

## 4. Frontend — Generación de Sitios

### 4.1 Astro (Web Estática)

```typescript
// src/pages/[slug].astro
const TENANT_SLUG = 'cliente-ejemplo'; // Configurado por proyecto

export async function getStaticPaths() {
  const payload = await getPayloadClient();
  const pages = await payload.find({
    collection: 'pages',
    where: {
      tenant: { equals: TENANT_SLUG },
      status: { equals: 'published' },
    },
    depth: 1, // Incluye relaciones (tenant, media) en una sola query
  });

  return pages.map(page => ({
    params: { slug: page.slug },
    props: { page },
  }));
}

const { page } = Astro.props;
---

<Layout tenant={page.tenant}>
  {page.layout.map(block => {
    switch (block.blockType) {
      case 'hero': return <HeroBlock data={block} />;
      case 'text': return <TextBlock data={block} />;
      case 'image': return <ImageBlock data={block} />;
      case 'contact': return <ContactBlock data={block} />;
      case 'menu': return <MenuBlock data={block} />;
      case 'footer': return <FooterBlock data={block} />;
    }
  })}
</Layout>
```

**CSS por componente:**
```css
/* src/components/HeroBlock/styles.css */
.hero-block {
  background: var(--hero-bg);
  color: var(--hero-text);
  padding: 4rem 2rem;
  text-align: center;
}

.hero-block h1 {
  font-size: 3rem;
  font-weight: 700;
}
```

### 4.2 Next.js (Tienda / Academia)

```typescript
// app/[slug]/page.tsx
const TENANT_SLUG = 'tienda-moda'; // Configurado por proyecto

export async function generateStaticParams() {
  const payload = await getPayloadClient();
  const pages = await payload.find({
    collection: 'pages',
    where: {
      tenant: { equals: TENANT_SLUG },
      status: { equals: 'published' },
    },
    depth: 1, // Incluye relaciones (tenant, media) en una sola query
  });

  return pages.map(page => ({
    slug: page.slug,
  }));
}

export default async function Page({ params }) {
  const page = await getPage(TENANT_SLUG, params.slug);

  return (
    <Layout tenant={page.tenant}>
      {page.layout.map(block => renderBlock(block))}
    </Layout>
  );
}
```

**Live Preview (Next.js only):**
```typescript
// app/api/preview/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Verificar token con Payload
  // Activar draft mode
  draftMode().enable();

  return redirect(searchParams.get('slug') || '/');
}
```

---

## 5. Multi-tenancy y Dominios

### 5.1 Configuración de Tenants

```typescript
// payload.config.ts
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant';

export default buildConfig({
  collections: [
    Tenants,
    Users,
    Pages,
    Media,
  ],
  plugins: [
    multiTenantPlugin<Config>({
      collections: {
        pages: {},
        media: {},
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) => {
        return user.roles?.includes('super-admin');
      },
    }),
  ],
});
```

### 5.2 Enrutamiento por Dominio

```typescript
// next.config.js (para Next.js)
async rewrites() {
  return [
    {
      source: '/((?!admin|api)):path*',
      destination: '/:tenantDomain/:path*',
      has: [
        {
          type: 'host',
          value: '(?<tenantDomain>.*)',
        },
      ],
    },
  ];
}

// Astro: uso de middleware o configuración de build
// Cada sitio se genera de forma independiente con el slug del tenant
```

### 5.3 CORS

El plugin multi-tenant requiere CORS abierto porque los dominios son dinámicos. Alternativa: mantener una lista de dominios permitidos en una variable de entorno y actualizarla al crear nuevos tenants.

---

## 6. Flujo de Trabajo

### 6.1 Programador (Super-Admin)

1. **Cliente contacta** → Notion/CRM (externo)
2. **Crear tenant en Payload**
   - Nombre, slug, dominio, tipo de servicio, tipo de frontend
3. **Configurar bloques disponibles**
   - Según el tipo de web: web estática → Hero, Text, Contact, Footer
   - Tienda → Hero, Product, Cart, Contact, Footer
4. **Crear páginas**
   - Inicio, Menú, Contacto, etc.
   - Agregar bloques y configurar contenido inicial
5. **Introducir contenido del cliente**
   - Textos, imágenes, datos que el cliente proporcionó
6. **Generar sitio**
   - Astro build (web estática) o Next.js build (tienda)
   - Deploy a Vercel/Netlify con dominio custom
7. **Dar acceso al cliente**
   - Crear usuario con rol `tenant-admin` o `tenant-editor`
   - Enviar credenciales por email

### 6.2 Cliente (Tenant-User)

1. **Login** → `admin.tuagencia.com` (Payload admin central)
   - El cliente accede al admin de Payload desde el backend centralizado
   - El plugin multi-tenant filtra automáticamente para que solo vea su tenant
2. **Ve solo sus páginas**
3. **Edita contenido:**
   - Cambia textos
   - Reemplaza imágenes
   - Actualiza precios (si es tienda)
   - **NO** crea/borra páginas
   - **NO** agrega bloques nuevos
   - **NO** cambia estructura
4. **Publica cambios**
   - Si es Astro: puede requerir rebuild
   - Si es Next.js: ISR puede regenerar la página

---

## 7. Diseño Independiente por Proyecto

### 7.1 Arquitectura: Backend Centralizado + Frontends Separados

**IMPORTANTE:** El backend (Payload) es **UNA instancia centralizada** que sirve a todos los clientes. Los frontends (Astro/Next.js) son **proyectos separados** por cliente.

```
agencia-backend/                    ← Payload CMS (único)
├── src/
│   ├── collections/               ← Tenants, Users, Pages, Media
│   ├── blocks/                      ← HeroBlock, TextBlock, etc.
│   ├── payload.config.ts           ← Configuración de Payload
│   └── server.ts
└── package.json

cliente-ejemplo.com/              ← Frontend Astro (cliente 1)
├── src/
│   ├── components/                  ← Hero, Menu, Footer
│   ├── styles/                      ← CSS vanilla
│   └── pages/
│       └── index.astro
└── package.json

tiendademoda.com/                   ← Frontend Next.js (cliente 2)
├── src/
│   ├── components/                  ← Hero, ProductGrid, Cart
│   ├── styles/                      ← CSS Modules
│   └── pages/
│       └── index.tsx
└── package.json
```

**Flujo de datos:**
1. Payload (backend) guarda todos los datos de todos los clientes
2. Cada frontend (Astro/Next.js) se conecta a Payload vía API REST
3. El frontend pide solo los datos de su tenant (`?where[tenant][equals]=cliente-ejemplo`)
4. El frontend genera el sitio estático (Astro) o SSR (Next.js)

### 7.2 Cada Web es Única

```
agencia-backend/
├── src/
│   ├── collections/
│   │   ├── Tenants.ts
│   │   ├── Users.ts
│   │   ├── Pages.ts
│   │   └── Media.ts
│   ├── blocks/
│   │   ├── HeroBlock.ts
│   │   ├── TextBlock.ts
│   │   └── ...
│   ├── payload.config.ts          ← Configuración ÚNICA de Payload
│   └── server.ts
└── package.json

cliente-ejemplo.com/ (frontend Astro)
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   ├── index.astro
│   │   │   └── styles.css         ← CSS vanilla para este componente
│   │   ├── Menu/
│   │   │   ├── index.astro
│   │   │   └── styles.css
│   │   └── Footer/
│   │       ├── index.astro
│   │       └── styles.css
│   ├── styles/
│   │   ├── variables.css           ← Colores, tipografía, espaciado
│   │   ├── global.css              ← Reset, base
  │   │   └── theme.css               ← Tema específico del cliente
│   └── pages/
│       └── index.astro
└── package.json

tiendademoda.com/ (frontend Next.js)
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   ├── index.tsx
│   │   │   └── styles.module.css   ← CSS Modules
│   │   ├── ProductGrid/
│   │   │   ├── index.tsx
│   │   │   └── styles.module.css
│   │   └── Cart/
│   │       ├── index.tsx
│   │       └── styles.module.css
│   ├── styles/
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── theme.css               ← Tema específico de la tienda
│   └── pages/
│       └── index.tsx
└── package.json
```

### 7.3 CSS es 100% Libre

- **Vanilla CSS**: archivos `.css` por componente
- **CSS Modules**: `.module.css` para scope local
- **SCSS**: `.scss` con variables, mixins, anidamiento
- **PostCSS**: plugins custom
- **NO Tailwind**: nunca

El programador tiene control total del diseño por proyecto.

---

## 8. Sistemas Externos (Opción A)

### 8.1 Stripe (Pagos)

- **Webhook:** Cuando un cliente paga el 50% inicial → marca `paymentStatus: 'initial-paid'` en Payload
- **Webhook:** Cuando paga el 50% final → `paymentStatus: 'fully-paid'`
- **Suscripción mensual:** Mantenimiento recurrente
- **Facturación:** Stripe genera facturas automáticas
- **Seguridad:** Todos los webhooks deben verificar la firma HMAC con `stripe.webhooks.constructEvent()`

### 8.2 Notion / Airtable (CRM)

- **Lista de clientes:** Nombre, email, teléfono, proyecto, estado
- **Proyectos:** Estado (pendiente, en desarrollo, entregado, mantenimiento)
- **Pagos:** 50% inicial, 50% final, mantenimiento mensual
- **Recordatorios:** Fechas de vencimiento de mantenimiento

### 8.3 Email (Notificaciones)

- **Nuevo cliente:** Bienvenida + credenciales de Payload
- **Proyecto entregado:** Instrucciones para editar contenido
- **Mantenimiento vencido:** Recordatorio de pago
- **Cambios publicados:** Confirmación al cliente

---

## 9. Localización (Multi-idioma)

Payload tiene localización nativa. Configuración:

```typescript
// payload.config.ts
export default buildConfig({
  localization: {
    locales: ['es', 'en', 'fr', 'de'],
    defaultLocale: 'es',
    fallback: true,
  },
});
```

El cliente selecciona el idioma en el admin y edita el contenido de esa versión.

**Frontend:**
- Astro: `astro-i18n` o `i18next` para routing (`/es/`, `/en/`)
- Next.js: `next-intl` o `i18next` con routing

---

## 10. Seguridad

### 10.1 Consideraciones

- **CORS:** Abierto por defecto (dominios dinámicos). Considerar whitelist de dominios.
- **Auth:** Payload usa JWT con refresh tokens. HTTPS obligatorio.
- **Archivos:** Media subidos a S3/Cloudinary con URLs firmadas.
- **Sanitización:** Rich text usa Lexical de Payload (seguro por defecto).
- **Rate limiting:** Implementar en API routes (Next.js) o en edge (Vercel).
- **Content Security Policy (CSP):** Implementar CSP headers en todos los frontends para prevenir XSS.

### 10.2 Backup

- **PostgreSQL:** Backups automáticos (Supabase, Railway, AWS RDS).
- **Media:** S3 con versioning.
- **Payload config:** Git.

---

## 11. Escalabilidad

### 11.1 Horizontal

- **Payload:** Stateless, escala con múltiples instancias.
- **Frontend:** Sitios estáticos en CDN (no escala, es cache).
- **Database:** PostgreSQL con read replicas si es necesario.

### 11.2 Nuevos Clientes

1. Crear tenant en Payload
2. Crear usuario
3. Configurar bloques y páginas
4. Generar sitio
5. Deploy con dominio custom

**No hay límite teórico de clientes.** Cada sitio es independiente.

---

## 12. Decisiones de Diseño

| Decisión | Justificación |
|----------|--------------|
| **Payload CMS** | Multi-tenant nativo, tipado fuerte, blocks system, admin panel listo |
| **Astro para webs estáticas** | Rendimiento, SEO, generación estática, sin JavaScript innecesario |
| **Next.js para tiendas/academias** | SSR, ISR, API routes, live preview, e-commerce dinámico |
| **Vanilla CSS / SCSS** | Control total del diseño, sin framework que imponga restricciones |
| **Sistemas externos (Stripe, Notion)** | Payload no es ERP/CRM. Mejor usar herramientas especializadas |
| **PostgreSQL** | Relacional, ACID, multi-tenant con schemas, Payload lo recomienda |
| **Vercel/Netlify** | CI/CD, edge CDN, dominios custom, serverless functions |

---

## 13. Media Storage (Almacenamiento de Imágenes y Videos)

### 13.1 Recomendación: Cloudinary

**Opciones evaluadas:**

| Opción | Pros | Contras | Precio |
|--------|------|---------|--------|
| **Cloudinary (recomendado)** | Resize automático, CDN global, WebP/AVIF, transformaciones on-the-fly, fácil integración | Límite gratuito (25GB), después $$$ | Gratis → $25/mes |
| **S3 + CloudFront** | Barato, control total, infinito, escalable | Configuración manual, resizing manual, no optimización automática | ~$0.023/GB/mes |
| **Supabase Storage** | PostgreSQL + Storage juntos, buena API, resizing | Menos maduro que S3, límites de plan | Gratis → $7/mes |
| **Vercel Blob** | Integrado con Vercel, simple, sin configuración | Lock-in a Vercel, más caro, menos control | Gratis → $20/mes |

### 13.2 ¿Por qué Cloudinary?

- **Optimización automática**: Subís una imagen de 5MB, Cloudinary la sirve en WebP de 200KB según el device
- **Resize on-the-fly**: `https://res.cloudinary.com/.../w_400,h_300/image.jpg` → thumbnail instantáneo
- **CDN global**: Imágenes cargan rápido en cualquier país
- **Payload ya lo soporta**: `@payloadcms/cloud-storage` tiene adapter para Cloudinary
- **Tenant isolation**: Podés usar folders (`/tenant-slug/`) para organizar por cliente
- **Backup automático**: Cloudinary tiene versioning
- **Video**: Cloudinary también maneja video (streaming, transcodificación, thumbnails)

### 13.3 Configuración en Payload

```typescript
// payload.config.ts
import { cloudStorage } from '@payloadcms/cloud-storage';
import { cloudinaryAdapter } from '@payloadcms/cloud-storage/cloudinary';

export default buildConfig({
  collections: [
    // ... otras colecciones
    {
      name: 'media',
      fields: [
        { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
        { name: 'alt', type: 'text' },
      ],
      upload: {
        adapter: cloudinaryAdapter({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          folder: 'agencia', // Base folder
        }),
        mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
        imageSizes: [
          { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
          { name: 'card', width: 768, height: 1024, position: 'centre' },
          { name: 'hero', width: 1920, height: 1080, position: 'centre' },
        ],
      },
    },
  ],
});
```

### 13.4 Uso en el Frontend

```typescript
// Astro o Next.js
const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_800,q_auto,f_webp/${publicId}`;
```

**Parámetros útiles:**
- `w_800` → ancho 800px
- `q_auto` → calidad automática (balance calidad/tamaño)
- `f_webp` → formato WebP
- `h_600` → alto 600px
- `c_crop` → crop centrado
- `dpr_2.0` → retina display

### 13.5 Videos

Para videos, Cloudinary ofrece:
- **Streaming**: HLS/DASH adaptive bitrate
- **Thumbnails**: Extraer frame automáticamente
- **Transcodificación**: Convertir a MP4/WebM
- **Optimización**: Compresión automática

```typescript
// Video URL
const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/q_auto/${publicId}.mp4`;
```

### 13.6 Costos Estimados

| Volumen | Cloudinary | S3 + CloudFront |
|---------|-----------|-----------------|
| 10GB/mes | $0 (gratis) | ~$0.23 |
| 100GB/mes | $25 | ~$2.30 |
| 1TB/mes | $99 | ~$23.00 |
| 10GB/mes video | $25 | ~$2.30 |

**Nota:** Cloudinary tiene un plan gratuito generoso (25GB storage, 25GB bandwidth). Para una agencia con 10-20 clientes, es suficiente inicialmente.

---

## 14. Dependencias

### 14.1 Backend (Payload)

```json
{
  "dependencies": {
    "payload": "^3.0.0",
    "@payloadcms/plugin-multi-tenant": "^3.0.0",
    "@payloadcms/db-postgres": "^3.0.0",
    "@payloadcms/richtext-lexical": "^3.0.0",
    "@payloadcms/cloud-storage": "^3.0.0",
    "@payloadcms/cloud-storage/cloudinary": "^3.0.0",
    "pg": "^8.0.0"
  }
}
```

### 14.2 Frontend Astro

```json
{
  "dependencies": {
    "astro": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 14.3 Frontend Next.js

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 15. Próximos Pasos

1. **Inicializar Payload:** `npx create-payload-app`
2. **Configurar multi-tenant:** Instalar plugin, definir colecciones
3. **Configurar Cloudinary:** Crear cuenta, configurar adapter en Payload
4. **Crear tenant de ejemplo:** Probar con un proyecto ficticio
5. **Generar frontend Astro:** Conectar a Payload API
6. **Generar frontend Next.js:** Probar con tienda de ejemplo
7. **Configurar Stripe:** Webhooks para pagos
8. **Configurar Notion:** CRM y gestión de proyectos
9. **Deploy:** Vercel para frontends, Railway/Supabase para PostgreSQL

---

## 16. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| **Payload admin es complejo para clientes** | Restringir permisos, ocultar colecciones, customizar labels |
| **Rebuild en Astro cada vez que el cliente edita** | ISR en Next.js (para tiendas), o webhook para rebuild en Astro |
| **Carga de imágenes lenta** | Cloudinary CDN global con optimización automática |
| **Dominios dinámicos en Vercel** | API de Vercel para crear dominios programáticamente |
| **Escalabilidad de PostgreSQL** | Supabase/Railway con backups automáticos |

---

## 17. Referencias

- [Payload Multi-Tenant Plugin](https://payloadcms.com/docs/plugins/multi-tenant)
- [Payload Multi-Tenant Example](https://github.com/payloadcms/payload/tree/main/examples/multi-tenant)
- [Payload Localization](https://payloadcms.com/docs/configuration/localization)
- [Astro Docs](https://docs.astro.build)
- [Next.js Docs](https://nextjs.org/docs)
- [Stripe Docs](https://stripe.com/docs)

---

**Documento aprobado por:** Joseba
**Fecha de aprobación:** 2026-06-08
