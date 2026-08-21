# Feature: Banner de bienvenida

**Slug:** `welcomeBanner` (feature key) / `welcome-banner` (Payload block slug)
**Estado:** Implementada (Sprint 0.5 — demo del pipeline `add-feature`).

## Qué hace

Agrega un block de Payload `welcome-banner` con dos campos:

- `text` (string opcional) — texto del banner. Override por admin.
- `enabled` (checkbox, default `true`) — switch on/off del banner.

El componente frontend (`WelcomeBanner.tsx`) se copia al proyecto del cliente en `src/components/blocks/` cuando se prende la feature.

## Cómo se usa

```bash
pnpm add-feature welcome-banner --slug=<tenant-slug>
pnpm add-feature welcome-banner --slug=<tenant-slug> --remove
pnpm add-feature --status --slug=<tenant-slug>
```

## Archivos que copia

- `src/components/blocks/WelcomeBanner.tsx` (template desde `nextjs-starter/src/components/blocks/WelcomeBanner.tsx`)

## Env vars que agrega

- `WELCOME_BANNER_TEXT=` (apendeada al `.env.example` del cliente; no toca `.env` ni `.env.local`)

## Resolución del texto

1. `block.text` (si está set en admin)
2. `process.env.WELCOME_BANNER_TEXT` (fallback)
3. `'¡Bienvenido!'` (literal default)

## Post-install manual

Después de `pnpm add-feature welcome-banner --slug=<slug>` el cliente debe:

1. **Wire el block en `BlockRenderer.tsx`** — abrir `nextjs-starter/src/components/BlockRenderer.tsx` y agregar:

   ```tsx
   import WelcomeBanner from '@/components/blocks/WelcomeBanner'
   // ...
   const components: Record<string, React.ComponentType<{ data: any }>> = {
     // ... existentes ...
     'welcome-banner': WelcomeBanner,
   }
   ```

2. **Setear `WELCOME_BANNER_TEXT`** en `.env` (no `.env.example`):

   ```
   WELCOME_BANNER_TEXT=Bienvenido a Mi Tienda
   ```

3. **(Opcional)** En Payload admin → abrir una página → tab "Content" → "Add Block" → "Welcome Banner" → setear texto custom.

## Limitaciones

- El wiring de `BlockRenderer` es manual. Pasar a auto-discovery es decisión de un sprint futuro (afecta el template).
- No hay soporte para Astro todavía (solo Next.js).
- Si install copia el componente pero falla appendeando la env var, intentamos limpiar el componente. Si ese cleanup también falla, queda el archivo como orphan. El `uninstall` posterior reconcilia.
