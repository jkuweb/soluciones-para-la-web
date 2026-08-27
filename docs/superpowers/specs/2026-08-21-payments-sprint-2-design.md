# Diseño: `payments` — Sprint 2 del ecommerce-kit (Stripe Checkout hosted + Connect per-tenant)

**Fecha:** 2026-08-21
**Autor:** Joseba
**Estado:** Aprobado (sección por sección en sesión)
**Sprint:** ecommerce-kit Sprint 2
**Complementa:** `2026-08-20-ecommerce-kit-design.md` §6 (Sprint 2 = "Stripe checkout, webhooks, /cart, /checkout, success")
**Depende de:** `2026-08-21-welcome-banner-demo-design.md` (patrón install/uninstall), Sprint 1 catalog (Tenants schema con `features` JSON, multi-tenant plugin)

---

## 1. Propósito

Reemplazar el stub de `payments` con el **loop end-to-end real de cobro**: el cliente configura Stripe Connect desde su storefront, los visitantes agregan productos al carrito, hacen checkout vía Stripe Checkout hosted, y el webhook confirma el pago y materializa la Order. Sin cuentas de usuario para el comprador — solo email. Sin fee de plataforma en Sprint 2 (YAGNI).

Es el segundo feature real del sistema `add-feature` y el primero que toca Stripe. Valida que el patrón install/uninstall + multi-tenant + Stripe SDK aguanta una feature más grande que un banner.

---

## 2. Contexto

- **Sprint 1 (catalog) cerrado y mergeado.** Define el patrón: collection multi-tenant + access helper (`catalogEnabled.ts`) + blocks + routes + install/uninstall con `MONOREPO_ROOT` + tests int/e2e. Payments lo replica con un componente de Stripe encima.
- **`agencia-backend/scripts/features/payments/` es STUB** (`install.ts`/`uninstall.ts` exportan desde `_stub.ts`). Hay que reemplazar con implementación real siguiendo el patrón de catalog.
- **`agencia-backend/src/access/catalogEnabled.ts`** es el template exacto para `paymentsEnabled.ts` — la lógica es idéntica salvo la condición de gate.
- **`Tenants.ts` ya tiene `features.payments: false` en el defaultValue del campo JSON.** Hay que SUMAR `stripeAccountId` (text) y `stripeAccountStatus` (select con 5 valores).
- **`CartBlock.ts` (slug `cart`) y `ProductBlock.ts` (slug `product`) existen como bloques placeholder** — semánticamente confusos. Catalog no los tocó; payments los absorbe (rename `cart` → `cart-summary`).
- **Stripe SDK NO está instalado aún.** Habrá que agregar `stripe` (server) en `agencia-backend` y `stripe` + `zustand` en `nextjs-starter`. **Ningún `@stripe/stripe-js`**: Checkout hosted y Connect OAuth son redirects puros, no requieren client SDK.
- **Divergencia previa conocida:** Sprint 1 spec decía `Categories`, realidad es `ProductCategories` (slug `product-categories`) por conflicto con blog taxonomy. Si surge conflicto de naming con Orders/Customers, misma precaución. **En este sprint no hay Customers collection** — solo email en la Order.
- **`nextjs-starter/src/lib/payload.ts`** ya tiene helpers para Products/ProductCategories (Sprint 1). Hay que sumar helpers para Orders.

---

## 3. Diseño

### 3.1 Arquitectura general

Tres dominios, cada uno con su hogar:

| Dominio | Proyecto | Responsabilidad |
|---|---|---|
| **Data + webhook** | `agencia-backend` | Orders collection, Tenants extensions, webhook handler (escribe Orders con Local API, system user, sin auth UI). |
| **UX + checkout** | `nextjs-starter` | Cart store, páginas `/cart`, `/checkout`, `/checkout/success`, `/checkout/cancel`, `/admin/pagos`, route handlers `/api/checkout/session` y `/api/stripe/connect/*`. |
| **SDK compartido** | Ambos | `stripe` (server) en cada uno. Mismo `STRIPE_SECRET_KEY` en ambos `.env`. |

**OAuth Connect es self-service en el storefront** (no en Payload admin). El tenant-admin entra a `/admin/pagos` en SU storefront (no en el backend), click "Conectar con Stripe", OAuth redirect, callback actualiza su propio Tenant.

### 3.2 Data model

#### 3.2.1 Orders collection (`agencia-backend/src/collections/Orders/Orders.ts`)

```ts
{
  slug: 'orders',
  access: {
    read:   ordersTenantAccess,
    create: paymentsEnabledTenantAccess,
    update: ordersTenantAccess,
    delete: ordersTenantAccess,
  },
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, index: true },
    { name: 'customerEmail', type: 'email', required: true, index: true },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'productId', type: 'text', required: true },
        { name: 'variantId', type: 'text', required: false },
        { name: 'name', type: 'text', required: true },
        { name: 'unitPrice', type: 'number', required: true, admin: { description: 'En centavos para evitar floats' } },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        { name: 'imageUrl', type: 'text', required: false },
      ],
    },
    { name: 'subtotal', type: 'number', required: true },
    { name: 'currency', type: 'text', required: true, admin: { description: 'ISO 4217' } },
    { name: 'stripeSessionId', type: 'text', required: false, index: true },
    { name: 'stripePaymentIntentId', type: 'text', required: false },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    { name: 'failedReason', type: 'text', required: false },
    { name: 'paidAt', type: 'date', required: false },
  ],
}
```

**Snapshot inmutable**: `items` es array de objetos planos, **NO** `relationship` a Product. Si el tenant edita o borra un Product después de la Order, la Order conserva nombre, precio, quantity originales. Sobrevive a deletes del producto.

#### 3.2.2 Tenants extensions (`agencia-backend/src/collections/Tenants.ts`)

Agregar al schema del campo JSON `features`:

```ts
{
  name: 'stripeAccountId',
  type: 'text',
  required: false,
  admin: { description: 'acct_... de Stripe Connect. Null hasta que el tenant completa OAuth.' },
},
{
  name: 'stripeAccountStatus',
  type: 'select',
  required: true,
  defaultValue: 'none',
  options: [
    { label: 'None',        value: 'none' },
    { label: 'Pending',     value: 'pending' },     // OAuth completado, falta KYC
    { label: 'Active',      value: 'active' },      // charges_enabled && payouts_enabled
    { label: 'Restricted',  value: 'restricted' },  // KYC parcial, soft hold
    { label: 'Rejected',    value: 'rejected' },    // disabled_reason starts with 'rejected.'
  ],
},
```

**No requiere migración SQL**: el campo `features` es JSON flexible. Tenants pre-existentes arrancan con `stripeAccountId: null` y `stripeAccountStatus: 'none'`. Solo `payload generate:types` para regenerar tipos TS.

#### 3.2.3 `paymentsEnabled` access (`agencia-backend/src/access/paymentsEnabled.ts`)

Template desde `catalogEnabled.ts`. Misma estructura, distinta condición de gate:

```ts
export const paymentsEnabledTenantAccess: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (user.roles?.includes('super-admin')) return true

  const tenantRefs = user.tenants ?? []
  if (tenantRefs.length === 0) return false

  const allowedTenantIds: (string | number)[] = []
  for (const ref of tenantRefs) {
    const tenantId =
      typeof ref.tenant === 'object' ? ref.tenant.id : ref.tenant
    if (tenantId == null) continue
    try {
      const tenant = await req.payload.findByID({
        collection: 'tenants',
        id: tenantId,
        depth: 0,
        overrideAccess: true,
      })
      const features = (tenant as { features?: {
        payments?: boolean
        stripeAccountStatus?: string
      } })?.features
      if (
        features?.payments === true &&
        features?.stripeAccountStatus === 'active'
      ) {
        allowedTenantIds.push(tenantId)
      }
    } catch {
      // Tenant lookup failed — skip this one.
    }
  }

  if (allowedTenantIds.length === 0) return false
  return { tenant: { in: allowedTenantIds } }
}
```

**Fail-closed**: si cualquier check falla → `false`. Default-deny. El gate es **estricto**: ambos `payments === true` Y `stripeAccountStatus === 'active'`. Sin OAuth completo, no se crean Orders.

### 3.3 Cart store + UX

#### 3.3.1 Cart store (`nextjs-starter/src/store/cart.ts`)

**Tecnología: Zustand con `persist` middleware.**

Por qué Zustand sobre `useReducer` + Context:

- SSR-safe vía `skipHydration` (Next.js App Router)
- `persist` middleware built-in → cart sobrevive a reloads sin código custom
- Selectors → re-renders aislados (cart-count badge en header sin re-render del cart tree)
- 1KB, maduro, sin Provider hell

**Shape**:

```ts
interface CartItem {
  productId: string
  variantId?: string
  name: string
  unitPrice: number      // en centavos para evitar floats
  currency: string       // ISO 4217: "ARS", "USD", "EUR"...
  quantity: number
  imageUrl?: string
}

interface CartState {
  tenantSlug: string | null
  items: CartItem[]
  add(item: CartItem, tenantSlug: string): void
  remove(productId: string, variantId?: string): void
  updateQty(productId: string, qty: number, variantId?: string): void
  clear(): void
}
```

**Persistencia**: `localStorage` con key `agencia-cart:{tenantSlug}` → **un carrito independiente por tenant**. Super-admin puede switchear de storefront sin perder items.

**CartProvider** (`nextjs-starter/src/components/cart/CartProvider.tsx`): client component que monta el store y llama `useCart.persist.rehydrate()` en `useEffect` (necesario con `skipHydration: true` para evitar hydration mismatch en SSR).

#### 3.3.2 Guards

- **Tenant mismatch**: si `item.tenantSlug !== cart.tenantSlug`, `add()` rechaza con toast `"Tu carrito tiene items de {otroTenant}. Limpiá el carrito para empezar de nuevo."` + botón "Limpiar y agregar".
- **Currency mismatch**: el cart hereda `currency` del primer item. Add de item con currency distinta → rechaza. **No hay FX en Sprint 2**; multi-currency real queda para un sprint propio.

#### 3.3.3 Rutas

| Ruta | Tipo | Responsabilidad |
|---|---|---|
| `/cart` | Client component | Lista de items + qty controls + subtotal. Botón "Ir a checkout" → `/checkout`. Empty state con link a home. |
| `/checkout` | Server shell + client form | Email input + order summary read-only + botón "Pagar con Stripe". Dispara POST `/api/checkout/session` → redirect a Stripe Checkout hosted. Si `stripeAccountStatus !== 'active'` → mensaje "Este comercio no acepta pagos online todavía". Cart vacío → redirect a `/cart`. |
| `/checkout/success` | Server component | Lee `?order_id={OrderID}`, busca Order por ID. Muestra confirmación + número de orden + email. Cliente dispara `cart.clear()` en mount. Edge case: webhook todavía no llegó → "Procesando tu pago…" con `revalidateTag('order-{id}')` cada 3s (timeout 30s, después muestra link a soporte). |
| `/checkout/cancel` | Server component | "Pago cancelado". Cart preservado. Botón "Volver al carrito". |

#### 3.3.4 Block strategy

`CartBlock` (slug `cart`) en backend es un **layout block embebido en Pages** — semánticamente es un summary embed, no el cart completo. Convive con la página `/cart`:

- **Block `cart-summary`** (rename) → mini-resumen dentro de una Page (ej: sidebar en página de producto).
- **`/cart`** → vista full-width dedicada con editor de cantidades.

**Rename**: slug `cart` → `cart-summary` (kebab-case, sin ambigüedad). Actualizar `BlockRenderer.tsx` case y barrel `agencia-backend/src/blocks/index.ts`. `ProductBlock` queda como placeholder sin uso en Sprint 2 (futuro sprint puede absorberlo o eliminarlo).

### 3.4 Stripe flow

#### 3.4.1 Checkout session — POST `/api/checkout/session`

```ts
// nextjs-starter/src/app/api/checkout/session/route.ts
1. Validar body: { items: CartItem[], email: string, tenantSlug: string }
2. Cargar tenant por slug. Si stripeAccountStatus !== 'active' → 403
3. SERVER-SIDE PRICE RECALCULATION ← crítico de seguridad
   Para cada item: getPayload().findByID({ collection: 'products', id: item.productId })
   → descartar precio/currency del cliente, usar el del server
   → si el producto no existe o no pertenece al tenant → 400
4. Currency consistency check: todos los items misma currency (la del tenant)
5. payload.create({
     collection: 'orders',
     data: {
       tenant: tenantId,
       customerEmail: email,
       items: itemsRecalculados,    // snapshot inmutable
       subtotal, currency,
       status: 'pending',
       stripeSessionId: null,
     }
   }) → orderId
6. stripe.checkout.sessions.create({
     mode: 'payment',
     payment_method_types: ['card'],
     line_items: itemsRecalculados.map(toStripeLineItem),
     customer_email: email,
     success_url: `${origin}/checkout/success?order_id=${orderId}`,
     cancel_url:  `${origin}/checkout/cancel?order_id=${orderId}`,
     payment_intent_data: {
       transfer_data: { destination: tenant.stripeAccountId },
       metadata: { orderId, tenantId, tenantSlug },
     },
     metadata: { orderId, tenantId, tenantSlug },
   }) → session
7. payload.update({ collection: 'orders', id: orderId, data: { stripeSessionId: session.id } })
8. Return { url: session.url }
```

**Por qué metadata.orderId y no buscar por session_id en el webhook**: el Order existe antes que la session, es source-of-truth. Webhook lee `metadata.orderId` → fetch directo. Cero ambigüedad, cero lookup.

#### 3.4.2 Connect OAuth — `/api/stripe/connect` + `/callback`

**Init** (`GET /api/stripe/connect`):

```ts
const state = signJwt({ tenantSlug, userId, nonce }, SECRET)  // HMAC + nonce, expira 10min
const url = `https://connect.stripe.com/oauth/authorize?` + qs({
  response_type: 'code',
  client_id:     env.STRIPE_CLIENT_ID,
  scope:         'read_write',
  redirect_uri:  `${origin}/api/stripe/connect/callback`,
  state,
})
redirect(url)
```

**Callback** (`GET /api/stripe/connect/callback?code=...&state=...`):

```ts
1. verifyJwt(state, SECRET) → { tenantSlug, userId }. Si falla → 400 (security log)
2. stripe.oauth.token({ grant_type: 'authorization_code', code, client_secret: STRIPE_SECRET_KEY })
   → { stripe_user_id: acct_... }
3. payload.update({
     collection: 'tenants',
     where: { slug: { equals: tenantSlug } },
     data: {
       'features.stripeAccountId':     stripe_user_id,
       'features.stripeAccountStatus': 'pending',  // se activa cuando charges_enabled=true
     },
   })
4. redirect(`/admin/pagos?status=connected`)
```

**Activación real**: el account pasa a `active` cuando Stripe confirma `charges_enabled && payouts_enabled`. Eso llega vía webhook `account.updated`, NO vía OAuth response (que solo da `stripe_user_id`).

#### 3.4.3 Webhook handler — POST `/api/payments/webhook`

Ubicación: `agencia-backend/src/app/api/payments/webhook/route.ts` (custom route en Payload, no API route de nextjs).

```ts
const sig = req.headers.get('stripe-signature')
const raw = await req.text()  // ← raw body, NO JSON.parse
const event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET)
// ↑ si firma inválida → throw → 400

switch (event.type) {
  case 'checkout.session.completed': {
    const { orderId } = event.data.object.metadata
    const order = await payload.findByID({ collection: 'orders', id: orderId })
    if (order.status === 'paid') break   // idempotencia
    await payload.update({
      collection: 'orders', id: orderId,
      data: {
        status: 'paid',
        paidAt: new Date().toISOString(),
        stripePaymentIntentId: event.data.object.payment_intent,
      },
    })
    break
  }
  case 'checkout.session.expired': {
    const { orderId } = event.data.object.metadata
    await payload.update({
      collection: 'orders', id: orderId,
      data: { status: 'failed', failedReason: 'expired' },
    })
    break
  }
  case 'account.updated': {
    const acct = event.data.object
    const status = computeAccountStatus(acct)
    // 'rejected' si disabled_reason empieza con 'rejected.', 'active' si charges+payouts enabled,
    // 'restricted' si alguna falta, 'pending' si no hay info todavía
    await payload.update({
      collection: 'tenants',
      where: { 'features.stripeAccountId': { equals: acct.id } },
      data: { 'features.stripeAccountStatus': status },
    })
    break
  }
  default:
    // ack pero no actuar — Stripe no reintenta unknowns
    break
}
return new Response('ok', { status: 200 })
```

**Eventos manejados**: 3 (`checkout.session.completed`, `checkout.session.expired`, `account.updated`). El resto se acknowledge pero se ignora. Stripe solo reintenta 5xx.

**`computeAccountStatus`**:
```ts
function computeAccountStatus(acct: Stripe.Account): 'active' | 'restricted' | 'pending' | 'rejected' {
  if (acct.requirements?.disabled_reason?.startsWith('rejected.')) return 'rejected'
  if (acct.charges_enabled && acct.payouts_enabled) return 'active'
  if (acct.charges_enabled === false || acct.payouts_enabled === false) return 'restricted'
  return 'pending'
}
```

#### 3.4.4 Environment variables

| Var | Scope | Dónde |
|---|---|---|
| `STRIPE_SECRET_KEY` | server | nextjs-starter + agencia-backend |
| `STRIPE_WEBHOOK_SECRET` | server | agencia-backend (webhook handler) |
| `STRIPE_CLIENT_ID` | server | nextjs-starter (OAuth init) |
| `STRIPE_OAUTH_STATE_SECRET` | server | nextjs-starter (sign/verify state JWT) |

**No** se necesita `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — hosted Checkout + Connect redirect no la usan.

### 3.5 Install/uninstall + file inventory

#### 3.5.1 agencia-backend — nuevos

| Path | Propósito |
|---|---|
| `src/collections/Orders/Orders.ts` | Collection definition (campos de §3.2.1). |
| `src/collections/Orders/index.ts` | Barrel export. |
| `src/collections/Orders/access.ts` | `read`, `create`, `update`, `delete` con `paymentsEnabled` + tenant guard. |
| `src/access/paymentsEnabled.ts` | Helper `paymentsEnabledTenantAccess` (§3.2.3). |
| `src/app/api/payments/webhook/route.ts` | Webhook handler (§3.4.3). |
| `src/blocks/CartSummaryBlock.ts` | Rename de `CartBlock.ts` (slug `cart` → `cart-summary`). |
| `scripts/features/payments/install.ts` | Install real (mirror de catalog/install.ts). |
| `scripts/features/payments/uninstall.ts` | Uninstall real. |
| `scripts/features/payments/README.md` | Docs: env vars, Stripe setup, `stripe listen`. |

#### 3.5.2 agencia-backend — modificados

| Path | Cambio |
|---|---|
| `src/payload.config.ts` | Importar y registrar `Orders` en `collections: [...]`. |
| `src/plugins/index.ts` | Agregar `orders: {}` a `multiTenantPlugin.collections`. |
| `src/collections/Tenants.ts` | Agregar `stripeAccountId` + `stripeAccountStatus` al JSON schema de `features`. |
| `src/blocks/index.ts` (o barrel equivalente) | Exportar `CartSummaryBlock` en vez de `CartBlock`. |
| `scripts/features/index.ts` | Swappear entry de `payments` de stub a real. |
| `.env.example` | Sumar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. |

#### 3.5.3 nextjs-starter — nuevos

| Path | Propósito |
|---|---|
| `src/store/cart.ts` | Zustand store + persist (§3.3.1). |
| `src/components/cart/CartProvider.tsx` | Hidrata el store en mount (`skipHydration`). |
| `src/components/cart/AddToCartButton.tsx` | Reusable client component para Pages y blocks. |
| `src/components/cart/CartBadge.tsx` | Header badge con `cart.items.length`. |
| `src/components/blocks/CartSummaryBlock.tsx` | Render real del block `cart-summary` (reemplaza placeholder). |
| `src/lib/stripe.ts` | `new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '<pinned-version>' })` + helpers `createCheckoutSession`, `exchangeOAuthCode`. **Pin** a la versión actual del SDK al momento del install (ej. `'2024-12-18.acacia'`); no usar `'latest'`. |
| `src/app/cart/page.tsx` | Cart page. |
| `src/app/checkout/page.tsx` | Checkout form. |
| `src/app/checkout/success/page.tsx` | Confirmation + polling. |
| `src/app/checkout/cancel/page.tsx` | Cancel message. |
| `src/app/admin/pagos/page.tsx` | OAuth self-service UI (tenant-admin only). |
| `src/app/api/checkout/session/route.ts` | POST → create Order + Stripe session. |
| `src/app/api/stripe/connect/route.ts` | GET → redirect a Stripe OAuth. |
| `src/app/api/stripe/connect/callback/route.ts` | GET → exchange code, update Tenant. |

#### 3.5.4 nextjs-starter — modificados

| Path | Cambio |
|---|---|
| `src/lib/payload.ts` | Sumar helpers `findOrderById`, `findOrderBySessionId`, `createPendingOrder`. |
| `src/lib/types.ts` | Sumar `Order`, `CartItem`, `CartSummaryBlock` types. |
| `src/components/BlockRenderer.tsx` | Reemplazar case `'cart'` por `'cart-summary'`. |
| `src/components/blocks/CartBlock.tsx` | Borrar (reemplazado por CartSummaryBlock). |
| `.env.example` | Sumar `STRIPE_SECRET_KEY`, `STRIPE_CLIENT_ID`, `STRIPE_OAUTH_STATE_SECRET`. |

#### 3.5.5 Dependencias

| Proyecto | Nuevas |
|---|---|
| `agencia-backend` | `stripe` (server) |
| `nextjs-starter` | `stripe` (server), `zustand` (client) |

**Ningún `@stripe/stripe-js`**, ningún client SDK de Stripe.

#### 3.5.6 Install script (`payments/install.ts`)

Mirror del catalog. Pasos:

1. Validar `destDir` existe y es directorio.
2. Validar que el source template (`nextjs-starter/`) tiene los archivos que se van a copiar (fail-fast si el template no está actualizado).
3. Copiar archivos listados en §3.5.3 (cart store, helpers, components, pages, API routes). Si alguno falla → cleanup de los ya copiados + `return { ok: false }`.
4. Editar `nextjs-starter/src/lib/payload.ts` y `src/lib/types.ts` (sumar helpers y types). O alternativamente: instalar los archivos completos y que el merge manual lo haga el dev post-install.
5. Editar `nextjs-starter/src/components/BlockRenderer.tsx` (case `cart-summary`).
6. Appender env vars a `.env.example` (skip si ya están).
7. Correr `payload generate:types` para regenerar `Order`, `CartItem` types.
8. **Imprimir el comando `stripe listen --forward-to localhost:3000/api/payments/webhook`** (dev friction es el #1 killer).
9. Retornar `{ ok: true, copiedFiles: [...], envKeysAdded: [...] }`.

**Update path post-install**: el install copia archivos al client repo la primera vez. Para updates posteriores de template a cliente, separar en dos categorías según `sync:client` blocklist:

- **Sincable** (`src/store/*`, `src/lib/stripe.ts`, `src/lib/types.ts`, `src/app/cart/*`, `src/app/checkout/*`, `src/app/api/checkout/session/*`, `src/app/api/stripe/*`, `src/components/cart/*`): `pnpm sync:client --slug=<slug>` los propaga normalmente.
- **Blocklist** (`src/components/blocks/CartSummaryBlock.tsx`, `src/components/blocks/CartSummaryBlock.tsx.module.css`): quedan fuera del sync. Updates requieren patch manual o futura mejora de `sync:client` para permitir sub-allowlist de blocks. **Documentar esto en `payments/README.md`** para que el dev no se sorprenda.

#### 3.5.7 Uninstall script (`payments/uninstall.ts`)

1. Validar que ningún tenant tenga `features.payments === true`. Si hay activos → abort con mensaje. (Flag `--force` para bypasear.)
2. **No borra datos de Orders.** Preservar para re-install.
3. Resetear `features.payments = false` para todos los tenants.
4. (Opcional) Avisar que el dev debe correr `pnpm sync:client` en reverse para limpiar archivos del storefront.

### 3.6 Error handling

#### Checkout session creation (`/api/checkout/session`)

| Escenario | Status | Respuesta |
|---|---|---|
| Tenant sin `stripeAccountStatus === 'active'` | 403 | `{ error: 'tenant_not_active' }` |
| Cart vacío o mal formado | 400 | `{ error: 'invalid_cart' }` |
| Producto no existe / no pertenece al tenant | 400 | `{ error: 'invalid_product', productId }` |
| Currency mismatch en server-recalculated cart | 400 | `{ error: 'currency_mismatch' }` |
| Stripe API down | 503 | `{ error: 'stripe_unavailable' }` |
| Order creation falla | 500 | `{ error: 'order_creation_failed' }` |
| Success | 200 | `{ url: session.url }` |

#### Connect OAuth

| Escenario | Comportamiento |
|---|---|
| `state` JWT inválido o expirado | 400 + log security event |
| `code` expirado o ya usado | redirect a `/admin/pagos?error=connection_failed` |
| Stripe API failure | redirect a `/admin/pagos?error=connection_failed` |
| Tenant update falla | 500 con mensaje genérico (no leak de detalles internos) |

#### Webhook handler

| Escenario | Status | Comportamiento |
|---|---|---|
| Sin `stripe-signature` header | 400 | throw antes de cualquier DB access |
| Signature inválida | 400 | `constructEvent` throws |
| `checkout.session.completed` con `orderId` no encontrado | 200 + log warning | ack para evitar retry infinito, log para investigar |
| Order ya está `paid` | 200 | idempotencia, no update |
| Payload update falla | 500 | Stripe reintenta |
| `account.updated` con `acct.id` no matchea ningún tenant | 200 + log | orphan event, no crash |
| Event type desconocido | 200 | ack pero no procesar |

#### Cart store

| Escenario | Comportamiento |
|---|---|
| `add()` con tenant distinto al del cart | Rechaza + toast + CTA "Limpiar y agregar" |
| `add()` con currency distinta al cart | Rechaza + toast |
| `localStorage` lleno / deshabilitado | Store funciona en memoria, persistencia falla silenciosamente |
| `skipHydration` + SSR mismatch | `CartProvider` rehidrata en `useEffect`, después del primer paint |

### 3.7 Testing strategy

#### 3.7.1 Integration tests (Vitest)

Convención de paths del proyecto: `*.int.spec.ts` flat o agrupados en subdirs (`access/`, `scripts/`, `utilities/`).

**agencia-backend** (`agencia-backend/tests/int/`):

| Test file | Casos |
|---|---|
| `access/payments-enabled.int.spec.ts` | `true` solo si `features.payments && stripeAccountStatus === 'active'`. Cubre los 5 estados del enum. Super-admin bypass. |
| `access/orders-multi-tenant.int.spec.ts` | Tenant A no lee/edita Orders de Tenant B. Super-admin lee todos. Tenant con `paymentsEnabled=false` no puede crear Orders vía REST. |
| `collections/orders-snapshot.int.spec.ts` | Items snapshot es inmutable: editar Product después de crear Order NO muta Order. Order sin `tenant` falla validación. |
| `webhooks/stripe-webhook.int.spec.ts` | Sin signature → 400. Signature inválida → 400. `checkout.session.completed` → order `paid` con `stripePaymentIntentId`. Mismo evento dos veces → un solo update (idempotencia). `checkout.session.expired` → order `failed`. `account.updated` con `charges_enabled=true` → tenant `active`. `account.updated` con `disabled_reason='rejected.fraud'` → tenant `rejected`. Unknown event type → 200 ack, no procesar. |

**nextjs-starter** (`nextjs-starter/tests/int/` — ubicación exacta TBD durante implementación según convención del starter):

| Test file | Casos |
|---|---|
| `store/cart-store.int.spec.ts` | add/remove/updateQty/clear. Tenant mismatch rechaza + emite toast. Currency mismatch rechaza. Persist en localStorage. Carts independientes por tenant (keys distintas). |
| `api/checkout-session.int.spec.ts` | **Server-side price recalc**: cliente manda `unitPrice: 1` para producto de $100 → server usa $100. Tenant sin `stripeAccountStatus === 'active'` → 403. Currency mismatch en cart server-recalculado → 400. Crea pending Order antes de Stripe session. Devuelve `{ url }`. |
| `api/stripe-connect-callback.int.spec.ts` | State JWT inválido/expirado → 400. Token exchange falla → 500. Success path → tenant actualizado con `stripeAccountId` + `stripeAccountStatus='pending'`. |
| `blocks/cart-summary.int.spec.ts` | Block `cart-summary` renderiza empty state cuando cart vacío. Renderiza items cuando cart tiene contenido. Oculto si `paymentsEnabled=false` (en vez de tirar error). |

**Stripe SDK mockeado** con `vi.mock('stripe')`. No se hacen llamadas reales a Stripe en unit/int.

#### 3.7.2 E2E tests (Playwright)

**Setup global** (`setup.ts`): seedea un tenant de prueba con `stripeAccountStatus='active'` y un `acct_test_...` real de Stripe test mode. Levanta `stripe listen --forward-to localhost:3000/api/payments/webhook`.

**Storefront e2e** (`nextjs-starter/tests/e2e/`):

| Spec | Flujo |
|---|---|
| `checkout-happy-path.spec.ts` | Tenant-admin conecta Stripe OAuth (test mode) → user agrega producto → /cart → /checkout → email → "Pagar" → Stripe Checkout → tarjeta `4242 4242 4242 4242` → /checkout/success muestra confirmación + número de orden + total correcto. |
| `checkout-cancel-path.spec.ts` | Hasta Stripe Checkout → click "back" en Stripe → /checkout/cancel → mensaje + cart preservado (mismos items). |
| `currency-mismatch.spec.ts` | Tenant con productos USD → add USD → intentar add EUR → toast de error visible → EUR no se agregó → cart sigue con USD. |
| `no-stripe.spec.ts` | Tenant con `stripeAccountStatus='none'` → /checkout muestra mensaje "Este comercio no acepta pagos online" → botón "Pagar" no aparece. |

**Backend e2e** (`agencia-backend/tests/e2e/`):

| Spec | Flujo |
|---|---|
| `stripe-webhook-idempotency.spec.ts` | Después de un pago exitoso, re-disparar `checkout.session.completed` (mismo event.id) → Order sigue `paid`, no se duplica `paidAt`, no hay side effects colaterales. |

#### 3.7.3 Tests de seguridad (NO negociables)

1. **Webhook signature verification**: 4 casos (missing, malformed, expired, valid). Sin signature válida → 400 sin tocar DB.
2. **Server-side price recalculation**: cliente con precio `$0.01` para producto de $100 → server usa $100. Test corre en `/api/checkout/session`.
3. **Multi-tenant isolation**: Tenant A con GET sobre Order de Tenant B → 404 (no 403, para no leak existencia).
4. **OAuth state JWT CSRF**: callback con `state` firmado para tenant A intentando apply a tenant B → 400.
5. **Webhook idempotencia**: replay del mismo `event.id` → no doble-update.

#### 3.7.4 Stripe test mode

- **API keys**: docs en `payments/README.md` explican cómo obtener `sk_test_...` del dashboard.
- **Test cards**: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline), `4000 0000 0000 9995` (insufficient funds).
- **`stripe listen`**: install script imprime el comando exacto con el forward URL.
- **Test connected account**: pre-seeded en fixture con un `acct_test_...` real (creado una vez vía onboarding manual en Stripe test mode, guardado en `.env.test` o en el fixture). **NO se crea on-demand** en cada test (lento + deja cuentas colgadas en el dashboard de Stripe).

#### 3.7.5 CI gating

- **Unit/Int**: corre siempre en CI (sin secrets externos).
- **E2E**: corre solo si `STRIPE_TEST_SECRET_KEY` está presente en los secrets de CI. Si no, skip con mensaje claro. PRs de forkeos no rompen CI.

#### 3.7.6 Strict TDD

**Strict TDD para 4 piezas determinísticas y security-critical**:

- `cart-store` (lógica pura, sin red)
- `paymentsEnabled` access (pura)
- `webhook handler` (mockeable, determinístico)
- `checkout-session` route (mockeable, security-critical)

**Test-after** para: componentes UI, install/uninstall scripts (smoke manual + verificación en `mood`), E2E.

Si `sdd-init` activó `strict_tdd: true` para este proyecto, se respeta para esas 4 piezas.

#### 3.7.7 Smoke tenant

`mood` para smoke manual post-install (más simple que `tienda-pepe`). Setup manual: configurar productos USD, conectar Stripe OAuth test mode, hacer un purchase de prueba.

---

## 4. Non-goals

- **Application fee**: agency no cobra fee de plataforma en Sprint 2. `transfer_data.destination` se usa sin `application_fee_amount`. Configurar fee por tenant queda para sprint futuro (necesita UI + dashboard + accounting).
- **Refunds**: el status `refunded` existe en el modelo pero ningún endpoint ni UI lo dispara. Dashboard de Stripe es la única vía. Queda para sprint futuro.
- **Multi-currency real**: tenant vende en una sola currency (la del primer item del cart, que se asume coincide con la default del tenant). FX, multi-currency display, y conversión quedan para sprint propio.
- **Customer accounts**: explícitamente fuera. El comprador es identificado solo por email en la Order. Crear cuentas, historial, saved cards queda para sprint futuro.
- **Subscriptions / recurring payments**: no se contempla. Solo one-time payments en Sprint 2.
- **Mobile app / native**: la integración es via Stripe Checkout hosted (redirect web). Mobile native queda fuera.
- **Per-tenant application fee configuration**: fuera (ver application fee arriba).
- **Auto-discovery en BlockRenderer**: el wiring manual del case `cart-summary` queda como paso post-install documentado. Pasar a auto-discovery es decisión para sprint futuro.
- **Webhooks para otros eventos de Stripe** (dispute.created, payout.paid, etc.): no se manejan en Sprint 2. Solo los 3 documentados en §3.4.3.

---

## 5. Decisiones tomadas en sesión

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Stripe mode = **Stripe Checkout hosted (redirect)** | Stripe Elements (in-page form) / Payment Links | Menos código de UI, menos PCI scope, hosted por Stripe. |
| Stripe accounts = **per-tenant Stripe Connect (OAuth self-service)** | Single agency account / agency-managed per-tenant | El cliente gestiona su propio dinero. Menos responsabilidad legal para la agency. Setup es self-service desde `/admin/pagos`. |
| Scope Sprint 2 = **loop end-to-end sin customer accounts** | Solo `/checkout` sin webhook / o con accounts básicos | Validar el loop completo de cobro es el deliverable. Customer accounts es su propio sprint. |
| Cart store = **Zustand con `persist`** | `useReducer` + Context sin dep | Cart es cross-cutting (badge + cart page + product page + checkout) y persisted. Zustand gana en DX y tamaño. |
| Block slug rename **`cart` → `cart-summary`** | Mantener `cart` | El slug actual miente. Convención kebab-case-descriptivo del catálogo. Costo: 1 grep + 1 barrel update. |
| Cancel route = **`/checkout/cancel` aparte** | `?canceled=true` en `/checkout` | URL semántica > query param. Stripe pide `cancel_url` de todas formas. |
| Application fee = **0% en Sprint 2** | Configurar 2% default | YAGNI. Monetización de agency es por suscripción SaaS mensual, no fee transaccional. |
| Enum status = **`none`/`pending`/`active`/`restricted`/`rejected`** | Solo 4 valores sin `rejected` | Stripe KYC puede fallar terminalmente. Sin `rejected`, UX se rompe (tenant no sabe si es temporal o muerto). Se computa desde `requirements.disabled_reason`. |
| Webhook location = **Payload backend** | nextjs-starter con REST callback a Payload | Webhook escribe Orders → necesita Local API con system user. Menos moving parts. Stripe CLI escucha un solo puerto. |
| `stripe listen` comando **impreso por el install script** | Solo en README | Dev friction mata sprints. Comando visible en el output del install minimiza "olvidé correrlo". |
| Strict TDD en 4 piezas críticas | Strict TDD en todo | UI test-after es suficiente. Las 4 piezas (cart-store, paymentsEnabled, webhook handler, checkout-session route) son determinísticas y security-critical. |
| CI E2E = **skip-if-no-key** | Fail duro sin key | Forks externos no deberían necesitar credenciales de Stripe. CI privada corre la suite completa con secret. |
| Smoke tenant = **`mood`** | `tienda-pepe` | Más simple, menos productos, menos fricción para validar el loop. |

---

## 6. Referencias

- `docs/superpowers/specs/2026-08-20-ecommerce-kit-design.md` — sistema modular (Sprint 0, §6 fija scope de Sprint 2)
- `docs/superpowers/specs/2026-08-21-welcome-banner-demo-design.md` — patrón install/uninstall + rollback
- `agencia-backend/scripts/features/catalog/{install.ts,uninstall.ts,README.md}` — patrón de referencia Sprint 1
- `agencia-backend/scripts/features/payments/{install.ts,uninstall.ts,README.md}` — STUB a reemplazar
- `agencia-backend/scripts/features/_stub.ts` — stub actual
- `agencia-backend/scripts/features/types.ts` — `FeatureModule` y tipos
- `agencia-backend/scripts/features/index.ts` — registro de features (cambiar entry de `payments`)
- `agencia-backend/scripts/lib/monorepo.ts` — `MONOREPO_ROOT` helper
- `agencia-backend/src/access/catalogEnabled.ts` — template para `paymentsEnabled.ts`
- `agencia-backend/src/collections/Tenants.ts` — agregar `stripeAccountId` + `stripeAccountStatus`
- `agencia-backend/src/blocks/CartBlock.ts` — rename a `CartSummaryBlock.ts`
- `agencia-backend/src/payload.config.ts` — registrar Orders
- `agencia-backend/src/plugins/index.ts` — agregar `orders` a multiTenant
- `nextjs-starter/src/lib/payload.ts` — agregar helpers Orders
- `nextjs-starter/src/lib/types.ts` — agregar types `Order`, `CartItem`
- `nextjs-starter/src/components/BlockRenderer.tsx` — case `cart-summary`
- `docs/superpowers/plans/2026-08-21-catalog-sprint-1.md` — template para plan de implementación
- [Payload Multi-Tenant Plugin](https://payloadcms.com/docs/plugins/multi-tenant)
- [Stripe Checkout (hosted)](https://stripe.com/docs/payments/checkout)
- [Stripe Connect Standard onboarding](https://stripe.com/docs/connect/standard-accounts)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
