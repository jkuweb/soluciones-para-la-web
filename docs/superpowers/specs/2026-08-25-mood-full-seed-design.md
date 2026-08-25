# Mood Full Seed Design

Date: 2026-08-25
Status: Draft (pending user review)

## Goal

Close the known gap that `seed-mood-payments.ts` does not toggle `catalog: true`, and provide a complete demo dataset (categories + products) for the `mood` tenant so that Task 25 (manual E2E verification of payments) can exercise the full checkout flow against realistic sneakers instead of two smoke items.

A single command — `pnpm seed:mood-full` — should leave the `mood` tenant ready for the manual E2E: payments flag on, catalog flag on, four categories, twelve sneakers, two smoke products.

## Scope

**In scope**

- New script `agencia-backend/scripts/seed-mood-full.ts` invoked via `pnpm seed:mood-full`.
- The script sets `features.payments`, `features.catalog`, `features.stripeAccountStatus`, and `features.stripeAccountId` in one shot.
- The script upserts 4 product categories and 14 products (12 sneakers + 2 smoke).
- All operations are idempotent: running the script twice yields the same final state.
- Vitest integration tests for the pure helpers and idempotency.

**Out of scope**

- Image uploads. Products get `images: []`. Adding Unsplash fetches + Media uploads is a separate follow-up.
- Tenant creation. The `mood` tenant must already exist via `pnpm create-client`.
- Catalog feature install. `Products` and `ProductCategories` collections live in the central `payload.config.ts` and are present regardless of any per-tenant flag. The `features.catalog` flag is the only thing that gates access.
- Storefront pages and blocks. The home page with `FeaturedProduct` / `ProductGrid` blocks is deferred. The Task 25 E2E uses the product detail page directly.
- Refactor of `seed-mood-payments.ts`. It stays as-is and remains useful for surgical payments-only seeding.

## Approach

Mirror the existing `seed-mood-payments.ts` pattern exactly so the new script is immediately readable to anyone who has seen the payments seed. The script is hardcoded to the `mood` tenant (same as `seed-mood-payments`) and reuses three named exports from it — `TENANT_SLUG`, `resolveStripeAccountId`, `SMOKE_PRODUCTS` — to avoid duplication. Other helpers (`buildPaymentsFeatures`, `upsertSmokeProduct`, `findProductBySlug`, `findTenantBySlug`, print helpers) are either re-implemented in the catalog-aware form or replaced by their generic equivalents in the new script.

The script file is organised into the same five blocks as the existing seed:

1. **Constants** — `TENANT_SLUG`, `CATEGORIES`, `SNEAKER_PRODUCTS`, plus the three re-imports.
2. **Pure helpers** — no DB calls. `buildFeatures`, `productToData`, `categoryToData`, `makeRichText`.
3. **DB ops** — Payload calls with `overrideAccess: true`. `findCategoryBySlug`, `upsertCategory`, generic `upsertProduct` (replaces `upsertSmokeProduct`), plus the re-imported `findTenantBySlug` and `findProductBySlug`.
4. **Output helpers** — `printBanner`, `printFeatureUpdate`, `printCategoryUpserted`, `printProductUpserted`, `printSummary`, `printNextSteps`.
5. **Orchestrator** — `run()`. End-to-end execution with explicit `process.exit(0)` to release Payload's DB pool.

## File Changes

| File | Action | Approx lines |
|------|--------|--------------|
| `agencia-backend/scripts/seed-mood-full.ts` | NEW | ~280 |
| `agencia-backend/tests/int/scripts/seed-mood-full.int.spec.ts` | NEW | ~120 |
| `agencia-backend/package.json` | UPDATE (add `seed:mood-full` script) | +1 |
| `agencia-backend/scripts/seed-mood-payments.ts` | unchanged | 0 |

The script entry in `package.json`:

```json
"seed:mood-full": "node scripts/loaders/run-with-css.mjs scripts/seed-mood-full.ts"
```

Same loader as `seed:mood-payments`.

## Data Definitions

### Categories (4)

```ts
type CategorySeed = {
  name: string
  slug: string
  description?: string
}

const CATEGORIES: readonly CategorySeed[] = [
  { name: 'Running',          slug: 'running',          description: 'Zapatillas de running para entrenamiento diario, tiradas largas y carreras.' },
  { name: 'Basketball',       slug: 'basketball',       description: 'Zapatillas de basketball con amortiguación reactiva y soporte lateral.' },
  { name: 'Casual',           slug: 'casual',           description: 'Estilo urbano para el día a día. Comodidad sin renunciar al diseño.' },
  { name: 'Limited Editions', slug: 'limited-editions', description: 'Drops exclusivos y ediciones limitadas. Pocas unidades disponibles.' },
] as const
```

`description` is a `textarea` (per `ProductCategories.ts`), so a plain string is fine.

### Sneaker Products (12)

```ts
type SneakerProduct = {
  title: string
  slug: string
  description: string       // plain string, wrapped via makeRichText
  price: number             // cents
  compareAtPrice?: number   // cents, optional
  currency: 'USD' | 'EUR'
  categorySlug: string      // FK to a CATEGORIES slug
  stock: number
  sku: string
}

const SNEAKER_PRODUCTS: readonly SneakerProduct[] = [
  // Running
  { title: 'Nike Pegasus 41',                slug: 'nike-pegasus-41',
    description: 'Zapatillas de running con amortiguación React Foam para entrenamientos diarios y tiradas largas.',
    price: 14999, currency: 'USD', categorySlug: 'running',          stock: 100, sku: 'NK-PEG-41' },

  { title: 'Adidas Ultraboost Light',        slug: 'adidas-ultraboost-light',
    description: 'Las Ultraboost más ligeras hasta la fecha. Espuma Light BOOST para máxima reactividad.',
    price: 18999, compareAtPrice: 21999, currency: 'USD', categorySlug: 'running', stock: 60, sku: 'AD-UB-LT' },

  { title: 'New Balance Fresh Foam 1080',    slug: 'new-balance-fresh-foam-1080',
    description: 'Máxima amortiguación con Fresh Foam X. Ideales para corredores de larga distancia que buscan comfort.',
    price: 16499, currency: 'EUR', categorySlug: 'running',          stock: 80, sku: 'NB-FF-1080' },

  { title: 'Asics Gel-Kayano 30',            slug: 'asics-gel-kayano-30',
    description: 'Estabilidad y soporte para pronadores. Tecnología FF BLAST PLUS para una pisada más suave.',
    price: 16999, currency: 'EUR', categorySlug: 'running',          stock: 70, sku: 'AS-GK-30' },

  // Basketball
  { title: 'Air Jordan 1 Mid',               slug: 'air-jordan-1-mid',
    description: 'El icónico Jordan 1 en su versión mid. Cuero premium y amortiguación Air-Sole en el talón.',
    price: 12999, currency: 'USD', categorySlug: 'basketball',       stock: 50, sku: 'AJ1-MID' },

  { title: 'Nike Kobe 8 Protro',             slug: 'nike-kobe-8-protro',
    description: 'Reedición del clásico Kobe 8 con amortiguación React moderna y construcción low-top para máxima movilidad.',
    price: 18999, currency: 'USD', categorySlug: 'basketball',       stock: 30, sku: 'NK-KB8-P' },

  { title: 'Adidas Harden Vol. 7',           slug: 'adidas-harden-vol-7',
    description: 'La firma de James Harden. Suela BOOST para explosividad en cada salto y corte.',
    price: 15999, currency: 'EUR', categorySlug: 'basketball',       stock: 45, sku: 'AD-HV7' },

  // Casual
  { title: 'Adidas Stan Smith',              slug: 'adidas-stan-smith',
    description: 'El clásico blanco y verde. Cuero sintético, suela de goma, atemporal.',
    price:  9999, currency: 'EUR', categorySlug: 'casual',           stock: 200, sku: 'AD-SS' },

  { title: 'Vans Old Skool',                 slug: 'vans-old-skool',
    description: 'Las zapatillas que empezaron todo. Lona resistente, suela waffle icónica, raya lateral.',
    price:  7999, currency: 'EUR', categorySlug: 'casual',           stock: 250, sku: 'VN-OS' },

  { title: 'Converse Chuck Taylor All Star', slug: 'converse-chuck-taylor-all-star',
    description: 'Las originales. Lona de algodón, suela de goma vulcanizada, inconfundibles.',
    price:  6999, currency: 'EUR', categorySlug: 'casual',           stock: 300, sku: 'CN-CT-AS' },

  // Limited Editions
  { title: 'Yeezy Boost 350 V2',             slug: 'yeezy-boost-350-v2',
    description: 'Drop exclusivo. Primeknit, tecnología BOOST, edición limitada.',
    price: 22999, compareAtPrice: 25999, currency: 'USD', categorySlug: 'limited-editions', stock: 5, sku: 'YZ-350V2' },

  { title: 'New Balance 990v6 MiUSA',        slug: 'new-balance-990v6-miusa',
    description: 'Fabricadas en Estados Unidos. Construcción premium, ENCAP y FuelCell para comfort diario.',
    price: 19999, currency: 'EUR', categorySlug: 'limited-editions', stock: 8, sku: 'NB-990V6' },
] as const
```

### Smoke Products (2)

Imported from `seed-mood-payments.ts`:

```ts
import { SMOKE_PRODUCTS, type SmokeProduct } from './seed-mood-payments'
```

`SmokeProduct` has `{ title, slug, price, currency }` — no `stock`, no `categorySlug`, no `description`, no `compareAtPrice`. The `run()` orchestrator wraps each `SmokeProduct` into the generic shape before calling `upsertProduct`:

```ts
function adaptSmokeProduct(product: SmokeProduct, tenantId: number) {
  return {
    title: product.title,
    slug: product.slug,
    description: makeRichText(`Smoke test product for ${product.currency} currency validation.`),
    price: product.price,
    compareAtPrice: undefined,
    currency: product.currency,
    images: [],
    category: undefined,                 // no category for smoke products
    stock: 100,                          // matches existing upsertSmokeProduct behavior
    sku: `SMOKE-${product.currency}`,
    status: 'published' as const,
    tenant: tenantId,
  }
}
```

The generic `upsertProduct` is then called for both sneakers and smoke products. The smoke-specific `upsertSmokeProduct` from `seed-mood-payments.ts` is no longer used by this script.

### Product Description (richText)

`Products.description` is `type: 'richText'`, which means a Lexical `SerializedEditorState`. Use the same helper pattern as `tests/int/blog-permissions.int.spec.ts`:

```ts
function makeRichText(text: string) {
  return {
    root: {
      type: 'root' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'text' as const,
          format: 0,
          style: '',
          text,
          mode: 'normal' as const,
          detail: 0,
          version: 1,
        },
      ],
    },
  }
}
```

Each sneaker gets a 1-2 sentence marketing description. Spanish copy, since the demo is for a Spanish-speaking client.

## Helper Contracts

### `buildFeatures`

```ts
buildFeatures(
  currentFeatures: Record<string, unknown>,
  stripeAccountId: string,
): Record<string, unknown>
```

Returns a new object that spreads `currentFeatures` and overrides:

```ts
{
  ...currentFeatures,
  payments: true,
  catalog: true,
  stripeAccountStatus: 'active',
  stripeAccountId,
}
```

Note: `catalog` is added on top of what `buildPaymentsFeatures` already sets. This is the gap closure.

### `productToData`

```ts
productToData(
  product: SneakerProduct,
  categoryId: number,
  tenantId: number,
): {
  title: string
  slug: string
  description: SerializedEditorState
  price: number
  compareAtPrice?: number
  currency: 'USD' | 'EUR'
  images: []
  category: number
  stock: number
  sku: string
  status: 'published'
  tenant: number
}
```

Converts the human-friendly `SneakerProduct` (with `categorySlug`) into the Payload-shaped data (with `category: number`). Only includes `compareAtPrice` when defined.

### `upsertProduct`

```ts
upsertProduct(
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  data: PayloadProductData,
): Promise<'created' | 'updated'>
```

`PayloadProductData` is the shape returned by `productToData` and `adaptSmokeProduct`. Same `findProductBySlug(payload, tenantId, data.slug)` → update-or-create pattern as the existing `upsertSmokeProduct`, but driven by a pre-shaped data object instead of a smoke-product type. Reused for both sneaker and smoke products.

The smoke-specific `upsertSmokeProduct` from `seed-mood-payments.ts` is not called by this script and remains available there for backwards compatibility.

### `run()`

```ts
async function run(): Promise<void> {
  const payload = await getPayload({ config })

  // 1. Find tenant (fail with instructions if missing)
  const tenant = await findTenantBySlug(payload, TENANT_SLUG)
  if (!tenant) {
    printTenantMissing()
    process.exit(1)
  }

  // 2. Build and write the combined features object
  const stripeAccountId = resolveStripeAccountId()
  const features = buildFeatures(tenant.features ?? {}, stripeAccountId)
  await updateTenantFeatures(payload, tenant.id, features)
  printFeatureUpdate(tenant.id, stripeAccountId)

  // 3. Upsert categories, build a slug → id map
  const categoryIds = new Map<string, number>()
  for (const category of CATEGORIES) {
    const { id } = await upsertCategory(payload, tenant.id, category)
    categoryIds.set(category.slug, id)
    printCategoryUpserted(category, 'created-or-updated')
  }

  // 4. Upsert sneaker products
  for (const product of SNEAKER_PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug)
    if (!categoryId) throw new Error(`Internal: missing category ${product.categorySlug}`)
    const data = productToData(product, categoryId, tenant.id)
    const action = await upsertProduct(payload, tenant.id, data)
    printProductUpserted(product, action)
  }

  // 5. Upsert smoke products (imported, adapted to generic shape)
  for (const product of SMOKE_PRODUCTS) {
    const data = adaptSmokeProduct(product, tenant.id)
    const action = await upsertProduct(payload, tenant.id, data)
    printProductUpserted(product, action)
  }

  // 6. Print summary + next steps
  printSummary({ categories: CATEGORIES.length, products: SNEAKER_PRODUCTS.length + SMOKE_PRODUCTS.length })
  printNextSteps(stripeAccountId)

  process.exit(0)
}
```

## Idempotency

Every entity has a unique `slug` (categories + products). Every upsert does `find by slug` → update if found, create otherwise. Running the script twice yields the same final state with no duplicates.

The `categoryIds` map is rebuilt each run from the categories collection, so re-runs correctly re-link products to categories even if the database was reset between runs.

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Tenant `mood` missing | Print `pnpm create-client` instructions, `process.exit(1)` |
| `payload.update` / `payload.create` throws | Bubble up — Payload logs the underlying error and the script exits non-zero via `process.exit(1)` |
| `STRIPE_ACCOUNT_ID_MOOD` not set | `resolveStripeAccountId()` returns the placeholder `acct_smoke_mood_placeholder`. `printNextSteps` warns the user. |
| Category FK missing during product upsert | Throw with explicit error: `Internal: missing category ${slug}`. This should never happen — categories are upserted first. |

No try/catch wrappers around Payload calls. Errors bubble naturally and the wrapper script (`run-with-css.mjs`) reports non-zero exit.

## Testing

`agencia-backend/tests/int/scripts/seed-mood-full.int.spec.ts`. Mirrors the pattern of `tests/int/scripts/sync-template.int.spec.ts` (test DB + `getPayload` + assert against DB state).

**Pure helpers** (no DB):

- `buildFeatures`: merges correctly, preserves existing keys, sets all four feature flags (`payments`, `catalog`, `stripeAccountStatus`, `stripeAccountId`).
- `productToData`: shapes the Payload data correctly. Includes `compareAtPrice` when present, omits when absent. Wraps description via `makeRichText`. Maps `categorySlug` to `category: number`.
- `adaptSmokeProduct`: converts a `SmokeProduct` (minimal shape) into the generic `PayloadProductData` shape with `stock: 100`, generated SKU, and a stub description.

**DB ops** (integration):

- `upsertCategory` returns `'created'` when slug absent, `'updated'` when present.
- `upsertProduct` returns `'created'` when slug absent, `'updated'` when present. Idempotent on re-run.
- `findCategoryBySlug` returns null when missing, returns `{ id }` when present.

**End-to-end**:

- `run()` against test DB with a fresh `mood` tenant: 4 categories + 14 products present after.
- Idempotency: call `run()` twice, verify `totalDocs` for `product-categories` and `products` collections is unchanged.

## Migration / Rollout

1. Add `seed-mood-full.ts` and its test file.
2. Add the `seed:mood-full` entry in `package.json`.
3. Run `pnpm typecheck` to confirm no TS regressions.
4. Run `pnpm test:int -- seed-mood-full` to confirm tests green.
5. Smoke run against a real `mood` tenant (created via `pnpm create-client`): `pnpm seed:mood-full`. Verify in admin UI that all categories + products exist.
6. No migration required — additive change only. Existing `seed:mood-payments` continues to work.

## Open Questions

None. The catalog feature install question was resolved during brainstorming: `Products` and `ProductCategories` are part of the central `payload.config.ts`, not installed per-tenant. The `features.catalog` flag is the only per-tenant toggle.
