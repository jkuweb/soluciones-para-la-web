# Diseño: `ecommerce-kit` — Sistema modular de ecommerce para clientes Agencia

**Fecha:** 2026-08-20
**Autor:** Joseba
**Estado:** Borrador (pendiente de aprobación)
**Reemplaza / complementa:** `ProductBlock` y `CartBlock` actuales (placeholder), setup manual de Mood (`2026-06-12-mood-tienda-online-setup.md`).

---

## 1. Propósito

Definir un **sistema modular de ecommerce** que permita a cada cliente de Agencia tener tienda online con el set de features que necesite, **sin pagar ni montar lo que no usa**. El sistema se enchufa en `create-client.ts` (tier inicial) y se extiende bajo demanda con un sub-comando `add-feature` que va agregando bloques, pages, collections y config por cliente.

La unidad de modularidad es la **feature** (`catalog`, `payments`, `shipping`, `coupons`, `reviews`, `wishlist`, `taxes`, `abandoned-cart`, `subscriptions`). Cada feature es una carpeta autocontenida que sabe cómo patchear la DB, copiar archivos al cliente y dejar próximos pasos.

---

## 2. Contexto

- El backend es Payload CMS multi-tenant. Cada cliente es un documento en `Tenants` con un `slug` único. Las collections `Pages` y `Media` están aisladas por tenant mediante el plugin.
- Los templates son `astro-starter/` (web estática) y `nextjs-starter/` (tiendas / academias). Hoy el `nextjs-starter` tiene un `ProductBlock` y un `CartBlock` que son **placeholders**: no hay productos reales, ni carrito, ni checkout, ni Stripe.
- El patrón modular ya existe con `blogEnabled`: durante `create-client` se pregunta, se setea en el tenant, y se crea automáticamente la página "blog" si está prendido. Este sistema replica y extiende ese patrón.
- `serviceType` en `Tenants` ya incluye `tienda-online`. El sistema lo usa como gate: si no es tienda-online, no se pregunta nada de ecommerce.

---

## 3. Diseño

### 3.1 Visión general — 3 capas

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1 — Datos (Payload, multi-tenant)                 │
│  ├─ Tenants.features.{catalog, payments, shipping, ...} │
│  ├─ Products, Categories, Variants, Orders, Customers   │
│  └─ Taxes, ShippingZones, Coupons, Reviews              │
└─────────────────────────────────────────────────────────┘
                         ▲ Payload REST (filtrado por tenant)
┌─────────────────────────────────────────────────────────┐
│  CAPA 2 — Configuración (scripts/agencia-backend)       │
│  ├─ create-client.ts  → pregunta ecommerceTier al inicio│
│  └─ add-feature.ts    → prende/apaga features por slug  │
└─────────────────────────────────────────────────────────┘
                         ▲ genera/copia archivos
┌─────────────────────────────────────────────────────────┐
│  CAPA 3 — Renderizado (Next.js cliente)                 │
│  ├─ /shop, /product/[slug], /cart, /checkout            │
│  ├─ /account (pedidos, direcciones, wishlist)           │
│  └─ Bloques: ProductGrid, CartSummary, CheckoutForm     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Modelo de datos

#### Núcleo (presente con cualquier tier ≠ `none`)

| Collection | Slug | Campos clave | Multi-tenant |
|---|---|---|---|
| `Products` | `products` | `title`, `slug`, `description` (Lexical), `price`, `compareAtPrice`, `currency`, `images`, `category`, `tags`, `stock`, `sku`, `status` | sí |
| `Categories` | `categories` | `name`, `slug`, `description`, `parent` (relation recursiva), `image` | sí |
| `Orders` | `orders` | `orderNumber` (auto), `customer`, `items` (snapshot), `subtotal`, `shipping`, `tax`, `total`, `currency`, `status`, `shippingAddress`, `billingAddress`, `paymentIntent` (Stripe ID) | sí |
| `Customers` | `customers` | `user` (relation a Users), `addresses` (array), `defaultShippingAddress`, `defaultBillingAddress`, `totalSpent` | sí |

#### Features optativas

| Feature | Collection(s) extra | Qué agrega |
|---|---|---|
| `shipping` | `ShippingZones`, `ShippingMethods` | Zonas geográficas + métodos (gratis, tarifa fija, por peso) |
| `coupons` | `Coupons` | Códigos de descuento (% o fijo), restricciones |
| `reviews` | `Reviews` | Rating 1-5 + comentario, vinculado a Product y Customer |
| `wishlist` | (no colección propia) | Array `wishlistItems` dentro de `Customers` |
| `taxes` | `TaxRates` | Reglas de impuesto por país/categoría (override del default) |
| `abandoned-cart` | (no colección) | Hook sobre el cart store + email recovery |
| `subscriptions` | `Subscriptions` | Productos recurrentes (Stripe Subscriptions API) |

**Multi-tenancy:** todas las collections nuevas usan el plugin multi-tenant, igual que `Pages` y `Media` hoy. El `access` de cada collection lee `req.user.tenants` + `tenant.features.<x>` para decidir visibilidad/edición.

### 3.3 Cambios en `Tenants`

Dos campos nuevos al lado de `blogEnabled`:

```ts
{
  name: 'ecommerceTier',
  type: 'select',
  options: [
    { label: 'Sin ecommerce', value: 'none' },
    { label: 'Lite (catálogo + Stripe)', value: 'lite' },
    { label: 'Standard (+ envíos + cupones)', value: 'standard' },
    { label: 'Full (+ reviews + wishlist + taxes)', value: 'full' },
  ],
  defaultValue: 'none',
  admin: { position: 'sidebar' },
},
{
  name: 'features',
  type: 'json',
  defaultValue: {
    catalog: false, payments: false, shipping: false,
    coupons: false, reviews: false, wishlist: false,
    taxes: false, abandonedCart: false, subscriptions: false,
  },
  admin: { position: 'sidebar', readOnly: false },
}
```

**¿Por qué `json` y no checkbox por feature?** Para no migrar schema cada vez que se agrega una feature. Los access controls leen `features.<x>` directo.

### 3.4 Cambios en `create-client.ts`

Nuevo bloque de prompts cuando `serviceType === 'tienda-online'`:

```
? Tipo de servicio: Tienda Online
? Tier inicial de ecommerce:
  ❯ Lite (catálogo + Stripe)
    Standard (Lite + envíos + cupones)
    Full (Standard + reviews + wishlist)
    Custom (elijo feature por feature)
```

Si elige **Custom**, segundo prompt con checklist multi-select (`@clack/prompts` multi-select).

`buildTenantData` setea `ecommerceTier` y `features` en Payload. El resto del flujo (user, clonar template, `.env`) sigue igual.

### 3.5 Nuevo script `add-feature.ts`

Ubicación: `agencia-backend/scripts/add-feature.ts`. Una sola feature por corrida.

```bash
pnpm add-feature shipping --slug=mood
pnpm add-feature stripe --slug=mood          # alias corto de "payments"
pnpm add-feature reviews --slug=mood
pnpm add-feature shipping --slug=mood --remove
pnpm add-feature --slug=mood --status
pnpm add-feature shipping --filter=ecommerce-tier:standard
```

**Flujo interno:**

1. Lee el tenant por `slug`. Si no existe, error.
2. Lee `features` actual. Si ya está en el estado pedido, avisa y termina (idempotente).
3. Si prendiendo:
   - Patchea `features.<x>: true` en el tenant.
   - Copia los archivos desde `agencia-backend/scripts/features/<x>/` al `CLIENTS_DIR/<slug>/`.
   - Si requiere vars en `.env` (ej: Stripe), las agrega.
   - Imprime próximos pasos específicos.
4. Si apagando:
   - Patchea `features.<x>: false`.
   - Borra los archivos copiados (whitelist — no toca custom del cliente).
   - Advierte que la config en el admin queda.
5. Rollback: si la copia falla, deja la DB como estaba.

### 3.6 Carpeta `scripts/features/`

Cada feature vive en su propia carpeta:

```
agencia-backend/scripts/features/
├── catalog/        # Products, Categories
├── payments/       # Stripe
├── shipping/
├── coupons/
├── reviews/
├── wishlist/
├── taxes/
├── abandoned-cart/
└── subscriptions/
```

`add-feature` corre código desde `scripts/features/<x>/install.ts` (encendido) y `uninstall.ts` (apagado), ambos reciben `{ tenantSlug, destDir }` y son responsables de su propia lógica.

### 3.7 Renderizado en el Next.js del cliente

#### Rutas

```
src/app/
├── shop/page.tsx                       # montado por feature catalog
├── shop/category/[slug]/page.tsx
├── product/[slug]/page.tsx
├── cart/page.tsx
├── checkout/page.tsx
├── checkout/success/page.tsx
├── account/                            # montado por feature customers (núcleo)
│   ├── page.tsx
│   ├── orders/page.tsx
│   ├── orders/[id]/page.tsx
│   └── addresses/page.tsx
└── api/webhooks/stripe/route.ts        # montado por feature payments
```

Todas las páginas filtran por `process.env.TENANT_SLUG` en el `where` de Payload — mismo patrón que ya usa `[slug]/page.tsx` para las pages.

#### Build y bundle

Las pages de ecommerce se incluyen en el **build estático** del cliente. Si la feature está apagada, la page existe pero redirige a `/`. Esto evita rebuilds cada vez que se prende/apaga una feature.

```
Cliente SIN ecommerce → /shop redirige a /
Cliente CON catalog    → /shop renderiza el grid
```

#### `BlockRenderer` extendido

Reconoce bloques nuevos (`product-grid`, `cart-summary`, etc.) **solo si la feature está prendida** en el tenant. Si no, ignora silenciosamente (warning en dev).

#### Nuevos bloques de Payload

| Block | Slug | Feature requerida |
|---|---|---|
| `ProductGridBlock` | `product-grid` | `catalog` |
| `FeaturedProductBlock` | `featured-product` | `catalog` |
| `CategoryListBlock` | `category-list` | `catalog` |
| `CartSummaryBlock` | `cart-summary` | `payments` |
| `CouponInputBlock` | `coupon-input` | `coupons` |
| `ReviewsListBlock` | `reviews-list` | `reviews` |
| `WishlistButtonBlock` | `wishlist-button` | `wishlist` |

Los bloques viven en `agencia-backend/src/blocks/ecommerce/` y se registran condicionalmente en `Pages.layout` según `features` del tenant.

#### Estado del carrito

**Client-side** con `localStorage`. Store tipo Zustand o `useReducer` plano:

```ts
type CartItem = {
  productId: string
  variantId?: string
  quantity: number
  priceSnapshot: number   // congelado al agregar
}
```

Si después se prende la sincronización con DB (al iniciar sesión como Customer), se agrega como feature separada. No es parte del núcleo.

---

## 4. Decisiones tomadas

| Decisión | Justificación |
|---|---|
| **Sistema híbrido** (tier + sub-comandos) | Replica el patrón de `blogEnabled` (pregunta → listo), pero permite extender sin re-correr `create-client`. Cubre tanto clientes que arrancan con "lo mínimo" como los que crecen con el tiempo. |
| **España + Stripe como v1, arquitectura abierta a LATAM** | AGENTS.md ya dice "Stripe (external, via webhooks)". LATAM no aparece hoy; el costo de modelar multi-moneda/multi-impuesto desde el día 1 es alto. `currency` separado y `paymentProvider` configurable permiten sumar Mercado Pago después sin refactor. |
| **Cliente gestiona desde admin de Payload** | Igual que Pages y Posts. El plugin multi-tenant aísla. No agrego permisos custom raros. |
| **`features` como JSON, no checkboxes** | Cada feature nueva implicaría migración de schema con checkboxes. JSON permite extender sin tocar `Tenants`. Trade-off: UI menos linda, pero los access controls leen string keys. |
| **Colección `Products` independiente, no ProductBlock** | El ProductBlock actual es una ficha estática dentro de Pages. Una colección real permite stock, variantes, listado, SEO, carrito real. ProductBlock **se mantiene** como card embebible en pages de marketing. |
| **Carrito client-side (localStorage)** | Más simple que un carrito en DB. Suficiente para MVP. Sync al login queda como feature separada. |
| **Build estático con pages que redirigen** | Más simple que andar agregando/borrando rutas dinámicamente. Trade-off: hay URLs en producción que no hacen nada. |
| **Cada feature = carpeta autocontenida en `scripts/features/<x>/`** | Replica el patrón de `scripts/lib/`. Cada feature tiene `install.ts` y `uninstall.ts`. Portable, testeable, sin dependencias entre features (salvo las declaradas en `dependsOn`). |
| **`add-feature` corre DESPUÉS de `create-client`** | No se mete toda la lógica de ecommerce en `create-client` (que ya está al límite de complejidad). Responsabilidad única. |

---

## 5. Trade-offs explícitos

| A favor | En contra |
|---|---|
| Máxima flexibilidad para el cliente (paga solo por lo que usa) | El super-admin tiene que entender qué feature hace qué antes de venderla |
| Sistema crece orgánicamente (cada sprint suma una feature) | El primer cliente ecommerce tarda más en estar listo que con un "todo prendido" |
| Tests aislados por feature | Tests de integración end-to-end requieren prender varias features simultáneamente |
| Onboarding claro para nuevos clientes | Riesgo de feature creep: cada pedido del cliente puede pedir una feature nueva |
| No bloquea ventas (cliente lite listo en minutos) | Mantener 9 features en distintos estados requiere disciplina |

---

## 6. Roadmap propuesto

| Sprint | Feature / Trabajo | Salida |
|---|---|---|
| 0 | Schema de Payload (collections núcleo), cambios en `Tenants`, prompt nuevo en `create-client.ts`, script `add-feature.ts` base | Cliente ecommerce "vacío" configurable |
| 1 | `catalog` (Products, Categories, /shop, /product/[slug], bloques) | Cliente con catálogo navegable, sin compra |
| 2 | `payments` (Stripe checkout, webhooks, /cart, /checkout, success) | Cliente puede vender |
| 3 | `shipping` (zonas, métodos, cálculo en checkout) | Envíos configurables |
| 4 | `coupons` (códigos, restricciones) | Marketing básico |
| 5 | `reviews` | Social proof |
| 6 | `wishlist` | Conversión |
| 7 | `taxes` (impuestos avanzados) | Compliance |
| 8 | `abandoned-cart` | Recovery |
| 9 | `subscriptions` | Recurrencia |

Cada sprint termina con: feature funcional en un cliente de prueba (`mood`), `add-feature` capaz de prenderla/apagarla, tests int + e2e, doc de uso.

---

## 7. Próximos pasos

1. Aprobar este doc con el usuario.
2. Pasar a `writing-plans` para armar el plan de implementación del Sprint 0 (y del Sprint 1 si el scope lo permite).
3. Implementar.
4. Validar con un cliente real (probablemente `mood`).
5. Iterar sobre el feedback.

---

**Pendiente de aprobación por:** Joseba
**Fecha objetivo de aprobación:** 2026-08-20
