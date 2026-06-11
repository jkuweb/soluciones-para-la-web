# Workflow: Creación de Frontends de Clientes

**Fecha:** 2026-06-10
**Autor:** Joseba
**Estado:** Aprobado
**Referencia:** Basado en arquitectura aprobada 2026-06-08

---

## 1. Propósito

Definir el workflow exacto para crear, estilizar y publicar la web de un cliente nuevo desde cero, usando el backend multi-tenant de Payload CMS y frontends Astro (o Next.js) separados.

---

## 2. Estructura de Repos

```
agencia/                        ← Monorepo principal
├── agencia-backend/            ← Payload CMS + PostgreSQL (único)
├── templates/                  ← Starters mantenidos por el programador
│   ├── astro-starter/
│   └── nextjs-starter/         ← Para futuro (tiendas/academias)
└── docs/

Cada cliente: repo independiente
├── cliente-ejemplo.com/      ← Clonado de astro-starter
├── tienda-ejemplo.com/       ← Clonado de nextjs-starter
└── ...
```

**Principio:** Un backend centralizado, frontends separados. El CSS y el diseño de cada frontend están en su propio repo.

---

## 3. Template `astro-starter`

### 3.1 Estructura

```
astro-starter/
├── src/
│   ├── components/
│   │   ├── blocks/               ← Hero, Text, Contact, Menu, Footer, etc.
│   │   │   ├── HeroBlock.astro
│   │   │   ├── TextBlock.astro
│   │   │   └── ...
│   │   ├── Layout.astro          ← Layout base con CSS global
│   │   └── RenderBlocks.astro    ← Renderizado dinámico según blockType
│   ├── lib/
│   │   └── payload.ts          ← Cliente Payload con filtro por tenant
│   ├── pages/
│   │   └── [slug].astro         ← Carga páginas desde Payload
│   └── styles/
│       ├── variables.css         ← Colores, tipografía, espaciado
│       ├── global.css            ← Reset, base
│       └── theme.css             ← SOLO ESTO CAMBIA POR CLIENTE
├── .env.example
├── astro.config.mjs
└── package.json
```

### 3.2 Cómo obtiene datos

El template consulta Payload con el `TENANT_SLUG` configurado en `.env`:

```typescript
const pages = await payload.find({
  collection: 'pages',
  where: {
    tenant: { equals: process.env.TENANT_SLUG },
    status: { equals: 'published' }
  },
  depth: 1
})
```

Cada página se renderiza como ruta estática (`[slug].astro`). Los bloques de layout se renderizan dinámicamente según el `blockType`.

### 3.3 CSS

- **Vanilla CSS** o **CSS Modules** por componente
- El `theme.css` contiene variables de diseño (colores, tipografía) que se sobreescriben por cliente
- **NO Tailwind** — control total del diseño
- Cada cliente puede tener su propia estética sin afectar a otros

---

## 4. Workflow paso a paso

### 4.1 Crear tenant en Payload

1. Acceder al panel de admin de Payload
2. Crear documento en colección `Tenants`
   - Nombre: "Cliente Ejemplo"
   - Slug: `cliente-ejemplo`
   - Dominio: `cliente-ejemplo.com`
   - Tipo de servicio: Web Estática
   - Tipo de frontend: Astro

### 4.2 Crear páginas y bloques

1. En colección `Pages`, crear páginas asignadas al tenant
   - Ej: "Inicio", "Menú", "Contacto"
2. Agregar bloques de layout según el tipo de negocio
   - Web estática: Hero, TextBlock, ImageBlock, ContactBlock, Footer
   - Tienda: Hero, ProductBlock, CartBlock, ContactBlock, Footer
3. Introducir contenido inicial (textos, fotos, datos de contacto)

### 4.3 Clonar template y configurar

```bash
# Copiar el template desde el monorepo agencia
# Desde fuera del monorepo:
cp -r agencia/templates/astro-starter cliente-ejemplo.com

# O bien: clonar el repo completo y copiar desde ahí
cd cliente-ejemplo.com

# Configurar .env
PAYLOAD_URL=http://localhost:3000  # O la URL del backend en producción
TENANT_SLUG=cliente-ejemplo

# Instalar dependencias
npm install
```

### 4.4 Personalizar CSS

1. Editar `src/styles/theme.css`
   - Colores, tipografía, espaciado
2. Editar bloques si hace falta
   - Ej: `HeroBlock.astro` para que sea full-screen
3. El CSS es 100% libre — no hay framework que imponga

### 4.5 Prueba local

```bash
npm run dev
```

- Acceder a `http://localhost:4321`
- Verificar que carga las páginas del tenant
- Verificar que bloques se renderizan correctamente

### 4.6 Deploy

> **Nota:** El diseño de deploy queda para fase posterior. Se documenta como placeholder.

- Astro genera sitio estático (`dist/`)
- Subir a hosting con dominio custom
- Opciones: Vercel, Netlify, Cloudflare Pages

---

## 5. Acceso del cliente

### 5.1 Crear usuario

- En Payload admin, crear usuario con rol `tenant-editor`
- Asignar al tenant correspondiente
- El plugin multi-tenant filtra automáticamente para que solo vea sus documentos

### 5.2 Lo que puede editar

- Textos de páginas
- Imágenes (subir/reemplazar)
- Precios (si es tienda)
- Datos de contacto

### 5.3 Lo que NO puede editar

- Crear/borrar páginas
- Agregar/quitar bloques
- Cambiar estructura
- Acceder a otros tenants

---

## 6. Rebuild cuando el cliente edita

- **Astro:** build estático. El cliente edita en Payload → el programador debe hacer `astro build` y redeployar.
- **Next.js:** ISR (Incremental Static Regeneration). El cliente edita → la página se regenera automáticamente en el servidor.

**Workaround para Astro:** En fase futura, se puede implementar un webhook que dispare rebuild automático en el hosting.

---

## 7. Decisiones tomadas

| Decisión | Justificación |
|----------|--------------|
| **Template base** | Evita repetir boilerplate. Nuevo cliente en minutos, no horas. |
| **CSS en repo** | Control total del diseño. Cada cliente es único. |
| **Astro para estáticas** | Performance, SEO, sin JavaScript innecesario. |
| **Next.js para dinámicas** | ISR, SSR, API routes. Futuro (tiendas, academias). |
| **Tenant slug en env** | El frontend sabe qué datos pedir sin harcodear nada. |
| **Deploy diferido** | Fase de diseño. Implementar deploy cuando haya un primer cliente real. |

---

## 8. Próximos pasos

1. Crear el template `astro-starter` con estructura base
2. Implementar conexión a Payload (cliente REST)
3. Implementar renderizado de bloques dinámico
4. Test con un tenant de ejemplo
5. Fase posterior: diseñar e implementar deploy

---

**Documento aprobado por:** Joseba
**Fecha de aprobación:** 2026-06-10
