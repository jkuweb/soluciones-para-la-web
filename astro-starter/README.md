# 🚀 Astro Starter - Agencia SaaS

Plantilla base para webs estáticas de clientes.

## ⚡ Requisitos

- Node.js `>=20.9.0`
- pnpm

## 🚀 Inicio Rápido

```bash
# Clonar este template
cp -r astro-starter mi-cliente-web
cd mi-cliente-web

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env:
#   PAYLOAD_API_URL=http://localhost:3000/api
#   TENANT_SLUG=mi-cliente

# Desarrollo
pnpm dev

# Build
pnpm build
```

## 📁 Estructura

```
astro-starter/
├── src/
│   ├── components/
│   │   ├── blocks/        # Bloques de Payload (Hero, Text, Image, Footer)
│   │   └── ui/           # Componentes UI reutilizables
│   ├── layouts/
│   │   └── Layout.astro  # Layout base
│   ├── lib/
│   │   └── payload.ts    # Cliente API de Payload
│   ├── pages/
│   │   └── [slug].astro  # Páginas dinámicas
│   └── styles/
│       ├── variables.css # Variables CSS
│       └── global.css    # Estilos globales
├── public/               # Assets estáticos
├── .env.example
├── astro.config.mjs
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
