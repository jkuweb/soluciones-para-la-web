# Agencia Frontend

Frontend público de la agencia de desarrollo web.

## Tech Stack

- **Framework**: Next.js 16
- **React**: 19.2.6
- **Styling**: CSS vanilla
- **CMS**: Payload CMS (backend en `agencia-backend/`)

## Getting Started

```bash
cd agencia-frontend

# Install dependencies
pnpm install

# Environment variables
cp .env.example .env
# Edit .env and set:
#   NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Run dev server
pnpm dev
```

## Project Structure

```
agencia-frontend/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # Reusable components
│   ├── blocks/              # Content blocks
│   ├── heros/               # Hero sections
│   ├── globals/             # Global components (Header)
│   ├── fields/              # Field components
│   ├── utilities/           # Utilities
│   └── lib/                 # Libraries
├── public/                  # Static assets
└── package.json
```

## Scripts

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server
pnpm typecheck        # TypeScript check
```

## Connection to Backend

This frontend connects to `agencia-backend` for:
- Pages content
- Media files
- SEO metadata

## License

MIT
