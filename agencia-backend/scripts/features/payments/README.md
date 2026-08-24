# Feature: `payments`

Stripe Checkout hosted + Stripe Connect per-tenant self-service. Habilita la collection `Orders` en Payload (multi-tenant), el cart store de Zustand en nextjs-starter, las rutas `/cart`, `/checkout`, `/checkout/success`, `/checkout/cancel`, `/admin/pagos`, las API routes `/api/checkout/session`, `/api/stripe/connect`, `/api/stripe/connect/callback`, y el block embebido `cart-summary`.

## What the install does

1. Verifies the destDir (the client's `nextjs-starter` repo) exists.
2. Copies the cart store (`src/store/cart.ts`).
3. Copies the 4 cart components (`CartProvider`, `AddToCartButton`, `CartBadge`, styles).
4. Copies the `CartSummaryBlock` renderer (block embebido en Pages).
5. Copies the `lib/stripe.ts` helper (Stripe SDK wrapper + OAuth state JWT).
6. Copies the 5 routes (`/cart`, `/checkout`, `/checkout/success`, `/checkout/cancel`, `/admin/pagos`).
7. Copies the 3 API routes (`/api/checkout/session`, `/api/stripe/connect`, `/api/stripe/connect/callback`).
8. Appends 3 Stripe env vars (`STRIPE_SECRET_KEY`, `STRIPE_CLIENT_ID`, `STRIPE_OAUTH_STATE_SECRET`) to `.env.example`.
9. Returns success — the calling `add-feature.ts` script then sets `features.payments = true` in the tenant.

## Required env vars (post-install)

The install adds empty placeholders. The dev must fill these in `.env` (not `.env.example`):

```bash
STRIPE_SECRET_KEY=sk_test_...           # https://dashboard.stripe.com/apikeys
STRIPE_CLIENT_ID=ca_...                  # https://dashboard.stripe.com/connect/applications
STRIPE_OAUTH_STATE_SECRET=<random-32-chars>  # openssl rand -hex 32
```

For the agency's backend (webhook signature verification), the dev must also set:

```bash
# agencia-backend/.env
STRIPE_WEBHOOK_SECRET=whsec_...
```

The install does NOT touch `agencia-backend/.env.example` — that's documented there already.

## What the install does NOT do (manual steps)

- **Wire `BlockRenderer.tsx`.** The client's `BlockRenderer.tsx` must register the `cart-summary` block. The template ships this already wired (Task 14 of the sprint 2 plan). Forks with custom BlockRenderers must merge this manually.
- **Create Payload collections in production.** `Orders` is part of the agency's `payload.config.ts` (added in Sprint 2 Task 4) and exists for all tenants once the agency backend is redeployed. The `add-feature` script only toggles `features.payments` for the specific tenant.
- **Run `pnpm install`.** The client must run `pnpm install` (or `pnpm update:client --apply` if using the sync scripts) to pick up the new `stripe` and `zustand` deps if they're not already in `package.json`. The install script does NOT modify `package.json` — the template ships those deps, and forks must merge manually.
- **Configure Stripe Connect application.** The tenant-admin must complete the Stripe Connect onboarding via `/admin/pagos` before `paymentsEnabled` returns true. Until KYC completes, `stripeAccountStatus === 'pending'` and Orders cannot be created.

## Run

```bash
pnpm add-feature payments --slug=<client-slug>
```

## Rollback

```bash
pnpm add-feature payments --slug=<client-slug> --remove
```

The uninstall removes the 16 files in the whitelist and the 3 Stripe env vars from `.env.example`. It does NOT remove the `Orders` collection from Payload (shared across all tenants).

## Known limitations

- **Cart store uses a single localStorage key** (`agencia-cart`) instead of per-tenant keys (`agencia-cart:{tenantSlug}` as in the spec). When a super-admin switches between two storefronts, the cart is rejected on the second `add()` instead of preserving two independent carts. The spec deviation is documented; the proper fix requires a factory pattern with one store per tenant (out of scope for Sprint 2).
- **Per-tenant Stripe API version pinning.** The `STRIPE_API_VERSION` in `lib/stripe.ts` is pinned to a specific Stripe SDK version. When the SDK is upgraded, the pin must be updated manually.

## Test client

The dev client is `mood`. Run `pnpm sync:client --slug=mood --apply` first to push template changes, then `pnpm add-feature payments --slug=mood` to enable. Verify the cart UI at `/cart`, the checkout flow at `/checkout`, and the admin onboarding at `/admin/pagos` (requires a Stripe Connect-enabled test account).
