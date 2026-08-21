# Feature: `catalog`

Catálogo de productos navegable. Habilita `Products` y `ProductCategories` (collections multi-tenant) en Payload, las rutas `/shop`, `/shop/category/[slug]`, `/product/[slug]` en nextjs-starter, y los bloques reusables `product-grid`, `featured-product`, `category-list`.

## What the install does

1. Verifies the destDir (the client's `nextjs-starter` repo) exists.
2. Copies the 3 frontend components into `src/components/blocks/`.
3. Copies the 3 routes into `src/app/`.
4. Copies the shared `src/lib/tenant.ts` helper (reads tenant features from env).
5. Appends `NEXT_PUBLIC_TENANT_FEATURES='{"catalog":true}'` to `.env.example`.
6. Returns success — the calling `add-feature.ts` script then sets `features.catalog = true` in the tenant.

## What the install does NOT do (manual steps)

- **Update the client's `lib/payload.ts`.** The install copies the query helpers (`getProducts`, `getProductBySlug`, `getProductCategories`) into the client only via the components' own imports. The client must already have these helpers in its `lib/payload.ts` (they ship via the template, but custom forks must merge them manually).
- **Wire `BlockRenderer.tsx`.** The client must register the 3 new components in its `BlockRenderer.tsx` and add feature-gating. The install copies the components but does not modify `BlockRenderer.tsx` because the client's file is custom.
- **Create Payload collections in production.** `Products` and `ProductCategories` are part of the agency's `payload.config.ts` and exist for all tenants once the agency backend is redeployed. The `add-feature` script only toggles `features.catalog` for the specific tenant.

## Run

```bash
pnpm add-feature catalog --slug=<client-slug>
```

## Rollback

```bash
pnpm add-feature catalog --slug=<client-slug> --remove
```

The uninstall removes only the files in the whitelist (the 7 files copied by the install) and the `NEXT_PUBLIC_TENANT_FEATURES` env var. It does NOT remove the `Product` / `ProductCategory` collections from Payload (those are shared across all tenants).

## Test client

The dev client is `mood`. Run `pnpm sync:client --slug=mood --apply` first to push template changes, then `pnpm add-feature catalog --slug=mood` to enable.
