# 🚀 Next.js Starter - Agencia SaaS

Plantilla base para tiendas online y academias de clientes.

## ⚡ Requisitos

- Node.js `>=20.9.0`
- pnpm

## 🚀 Inicio Rápido

```bash
# Clonar este template
cp -r nextjs-starter mi-cliente-tienda
cd mi-cliente-tienda

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env:
#   PAYLOAD_API_URL=http://localhost:3000/api
#   TENANT_SLUG=mi-tienda

# Desarrollo
pnpm dev

# Build
pnpm build
```

## 📁 Estructura

```
nextjs-starter/
├── src/
│   ├── components/
│   │   ├── blocks/        # Bloques de Payload (Hero, Product, Cart, Course, Footer)
│   │   └── ui/           # Componentes UI reutilizables
│   ├── app/
│   │   ├── [slug]/       # Páginas dinámicas
│   │   ├── page.tsx      # Página de inicio
│   │   └── layout.tsx    # Layout base
│   ├── lib/
│   │   ├── payload.ts    # Cliente API de Payload
│   │   └── types.ts      # Tipos TypeScript
│   └── styles/
│       ├── variables.css # Variables CSS
│       └── global.css    # Estilos globales
├── public/               # Assets estáticos
├── .env.example
├── next.config.ts
└── package.json
```

## 🎨 CSS

- Vanilla CSS o CSS Modules
- Variables en `src/styles/variables.css`
- NO Tailwind

## 🔌 Conexión a Payload

Las páginas se obtienen automáticamente de Payload API filtrando por `TENANT_SLUG`.

## 📝 Licencia

MIT
