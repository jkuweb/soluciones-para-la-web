# 🕸️ Soluciones para la Web

> Payload CMS 3.0 + Next.js 16 + PostgreSQL — proyecto base.

## 🚀 Comandos

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Inicia el dev server |
| `pnpm build` | Build de producción |
| `pnpm generate:types` | Regenera tipos tras cambiar collections |
| `pnpm generate:importmap` | Tras crear/modificar componentes |
| `pnpm lint` | ESLint |
| `pnpm test` | Tests completos (unit + e2e) |

## 🧪 Tests

- **Unit/Integración**: Vitest → `pnpm test:int`
- **E2E**: Playwright → `pnpm test:e2e`
- Necesitan `pnpm dev` corriendo en background.

## 📁 Estructura

```
src/
├── app/(frontend)/   → Páginas públicas
├── app/(payload)/    → Admin y API
├── collections/      → Collections de Payload
├── blocks/           → Bloques de contenido
├── components/       → Componentes React
├── globals/          → Globals (Header, etc.)
└── fields/           → Campos reutilizables
```

## 🗄️ Stack

- **CMS**: [Payload CMS 3.0](https://payloadcms.com)
- **Frontend**: [Next.js 16](https://nextjs.org)
- **BD**: PostgreSQL via `@payloadcms/db-postgres`
- **Media**: Cloudinary (no local)
- **Admin**: `/admin`

## 🔧 Primeros pasos

```bash
cp .env.example .env   # configurar DATABASE_URL
pnpm install
pnpm dev
```

Admin en `http://localhost:3000/admin`.
