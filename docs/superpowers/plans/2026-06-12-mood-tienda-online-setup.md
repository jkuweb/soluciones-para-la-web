# Mood — Tienda Online Setup Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the Next.js frontend for client "Mood" (online fashion store) from the starter template, configured and verifiable.

**Architecture:** Copy `nextjs-starter/` → `~/Clientes/mood/` as independent project. Configure `TENANT_SLUG=mood`, apply brand colors, verify with `pnpm build`.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript 5.7, CSS Variables

---

### Task 1: Copy starter template to mood/

**Files:**
- Create: `~/Clientes/mood/` (full copy from `agencia/nextjs-starter/`)

- [ ] **Step 1: Copy template directory**

```bash
cp -r /home/joseba/Clientes/agencia/nextjs-starter /home/joseba/Clientes/mood
```

Expected: `/home/joseba/Clientes/mood/` exists with all starter files.

- [ ] **Step 2: Remove node_modules and .next from copy**

```bash
rm -rf /home/joseba/Clientes/mood/node_modules /home/joseba/Clientes/mood/.next
```

Expected: Clean copy without build artifacts.

### Task 2: Personalize project config

**Files:**
- Modify: `~/Clientes/mood/package.json`
- Create: `~/Clientes/mood/.env`

- [ ] **Step 1: Update package.json**

Edit `~/Clientes/mood/package.json`:
```json
{
  "name": "mood",
  "version": "1.0.0",
  "description": "Mood — Tienda online de moda y estilo de vida",
  ...
}
```

- [ ] **Step 2: Create .env**

Create `~/Clientes/mood/.env`:
```bash
PAYLOAD_API_URL=http://localhost:3000/api
TENANT_SLUG=mood
```

### Task 3: Apply brand styling

**Files:**
- Modify: `~/Clientes/mood/src/app/styles/variables.css`
- Modify: `~/Clientes/mood/src/app/layout.tsx`

- [ ] **Step 1: Update CSS variables**

Edit `~/Clientes/mood/src/app/styles/variables.css`:
```css
:root {
  --color-primary: #1a1a2e;
  --color-primary-light: #2d2d5e;
  --color-accent: #c9a84c;
  --color-accent-hover: #b8942e;
  --color-bg: #faf8f5;
  --color-bg-alt: #f0ede8;
  --color-text: #1a1a2e;
  --color-text-light: #6b6b80;
  --color-white: #ffffff;
  --font-heading: 'Georgia', serif;
  --font-body: system-ui, -apple-system, sans-serif;
  --max-width: 1200px;
}
```

- [ ] **Step 2: Update layout metadata**

Edit `~/Clientes/mood/src/app/layout.tsx` — add metadata export:
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Mood',
    default: 'Mood — Moda y Estilo de Vida',
  },
  description: 'Descubre la nueva colección de Mood. Moda contemporánea para cada momento.',
}
```

### Task 4: Install and verify

- [ ] **Step 1: Install dependencies**

```bash
cd /home/joseba/Clientes/mood && pnpm install
```

Expected: Dependencies installed without errors.

- [ ] **Step 2: Build to verify**

```bash
cd /home/joseba/Clientes/mood && pnpm build
```

Expected: Build succeeds, Next.js outputs standalone build.
