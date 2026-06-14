# Diseño: Mood — Tienda Online (Cliente Ejemplo)

## Objetivo

Generar el frontend Next.js para el cliente "Mood", una tienda de moda/estilo de vida, partiendo del starter template `nextjs-starter/` y configurándolo como proyecto independiente.

## Arquitectura

```
┌──────────────────────────────────────────────────┐
│  ~/Clientes/agencia/ (backend)                   │
│  └── Payload CMS + PostgreSQL + multi-tenant     │
│      └── tenant: mood (tienda-online, nextjs)    │
└──────────────────────────────────────────────────┘
                        ▲ API REST (tenant filter)
                        │
┌──────────────────────────────────────────────────┐
│  ~/Clientes/mood/ (frontend)                     │
│  └── Next.js 16 (standalone output)              │
│      └── .env: TENANT_SLUG=mood                  │
│      └── Blocks: Hero, Text, Product, Cart, etc. │
└──────────────────────────────────────────────────┘
```

## Pasos

1. Copiar `agencia/nextjs-starter/` → `~/Clientes/mood/`
2. Personalizar `package.json` (nombre, descripción)
3. Configurar `.env` con `TENANT_SLUG=mood`
4. Personalizar variables CSS (colores de marca Mood)
5. `pnpm install` + `pnpm build` — verificar compilación

## Personalización de Marca

La tienda Mood usará una paleta moderna y elegante acorde a moda:
- Color primario: tono índigo profundo
- Acento: dorado/ámbar
- Tipografía: sistema (sin dependencias externas)

## Lo que NO incluye este setup

- Catálogo de productos o datos seed (se crean desde el admin de Payload)
- Stripe o pasarela de pago funcional
- Deploy a producción
- Tenant en backend (opcional, paso posterior)

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `mood/package.json` | `name: "mood"`, description |
| `mood/.env` | `TENANT_SLUG=mood` |
| `mood/src/app/styles/variables.css` | Colores de marca |
| `mood/src/app/layout.tsx` | Metadata (title, description) |
