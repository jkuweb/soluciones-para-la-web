# Hero Block — Additional Images Rendering Fix

**Date:** 2026-06-19
**Status:** Draft
**Author:** Gentle AI (orchestrator + brainstorming)

## Goal

Fix the bug where the Hero block's **Additional Images** (`images` array field) does not render on the frontend in either client template (Astro or Next.js). The Payload CMS schema already defines the field; only the frontend renderers are missing it.

## Context

`agencia-backend/src/blocks/HeroBlock.ts` defines:

- `enableImages` checkbox (admin toggle, locked to super-admin)
- `images` array of uploads (visible when `enableImages` is on)
- Label: "Additional Images"

The two client templates both read `title`, `subtitle`, `backgroundImage`, and `cta` — but **neither renders `data.images`**. As a result, the images saved in the Payload admin never reach the page.

## Approach

Add a `data.images` render block to each template, using markup-only patterns that defer all visual decisions to the client via CSS variables (same pattern the templates already use for `--hero-bg`, `--hero-text`, `--primary-color`).

**Layout: flex row, centered, wrap.** Chosen because:

- Simplest markup, no extra deps, responsive by default
- Client can override to `display: grid` in their own CSS without touching the template
- Most common Hero "additional images" pattern (product showcases, etc.)

## Files Changed

### `astro-starter/src/lib/types.ts`

Add to the `HeroBlock` interface (after `cta?: Link`):

```ts
images?: { image: MediaImage }[]
```

### `nextjs-starter/src/lib/types.ts`

Same addition to the local `HeroBlock` interface (after `cta?: Link`):

```ts
images?: { image: MediaImage }[]
```

> Both `types.ts` files declare their own `HeroBlock` interface (line 47 in each). The Payload schema in the backend has `images` as an array of `{ image: MediaImage }`, so the local type needs to match.

### `astro-starter/src/components/blocks/HeroBlock.astro`

- After the `</div>` of `.hero-content`, add:
  ```astro
  {data.images && data.images.length > 0 && (
    <div class="hero-additional-images">
      {data.images.map((item) => (
        <img
          src={getMediaUrl(item.image?.url || '')}
          alt={item.image?.alt || ''}
          class="hero-additional-image"
        />
      ))}
    </div>
  )}
  ```
- Add to the existing `<style>` block:
  ```css
  .hero-additional-images {
    display: flex;
    gap: var(--hero-image-gap, 1rem);
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 2rem;
  }
  .hero-additional-image {
    width: var(--hero-image-size, 120px);
    height: var(--hero-image-size, 120px);
    object-fit: cover;
    border-radius: var(--hero-image-radius, 0);
  }
  ```
- `getMediaUrl` is already imported at the top.

### `nextjs-starter/src/components/blocks/HeroBlock.tsx`

- After the `</div>` of `.hero-content`, add:
  ```tsx
  {data.images && data.images.length > 0 && (
    <div className="hero-additional-images">
      {data.images.map((item, i) => (
        <img
          key={i}
          src={item.image?.url || ''}
          alt={item.image?.alt || ''}
          className="hero-additional-image"
        />
      ))}
    </div>
  )}
  ```
- Add to the existing `<style jsx>` block (the same CSS as Astro, adjusted to styled-jsx syntax — actually, the same syntax works):
  ```css
  .hero-additional-images {
    display: flex;
    gap: var(--hero-image-gap, 1rem);
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 2rem;
  }
  .hero-additional-image {
    width: var(--hero-image-size, 120px);
    height: var(--hero-image-size, 120px);
    object-fit: cover;
    border-radius: var(--hero-image-radius, 0);
  }
  ```
- URL resolution uses `item.image?.url` directly to match the existing pattern in this template (the `backgroundImage` URL also does not use `getMediaUrl`).

### `agencia-backend/src/blocks/HeroBlock.ts`

**No changes.** Schema is correct.

## CSS Variables Exposed

| Variable                | Default | Purpose                          |
| ----------------------- | ------- | -------------------------------- |
| `--hero-image-size`     | `120px` | Width and height of each image   |
| `--hero-image-gap`      | `1rem`  | Gap between images               |
| `--hero-image-radius`   | `0`     | Border radius (clients can round) |

Clients override these in their own `styles/variables.css` (or equivalent) — no template changes needed.

## What's Out of Scope

- Carousel / lightbox for Additional Images (could be a future feature)
- Unifying URL resolution pattern between Astro (`getMediaUrl`) and Next.js (raw `url`) — separate ticket
- Changes to other blocks (Contact, Course, Footer, etc.)
- Automated tests (markup-only change, no testable logic)
- Backend schema adjustments

## Sync Flow Test Plan (validates `pnpm sync:client` / `sync:clients` / `update:clients` end-to-end)

After implementing the fix in both templates, validate the full flow from `~/Downloads/sync-demo-steps.pdf`:

1. **Preflight:** check `git status` in `agencia-backend` is clean (it has one unrelated change in `payload.config.ts` — leave it alone, it's not part of this fix).
2. **`astro-starter` fix** → `git diff` to confirm the change is the two blocks only.
3. **Singular dry-run + apply:**
   - `cd agencia-backend`
   - `pnpm sync:client --slug=educar-sano --verbose` (dry-run, line-by-line diff)
   - `pnpm sync:client --slug=educar-sano --apply`
   - `pnpm sync:client --slug=tienda-pepe --verbose`
   - `pnpm sync:client --slug=tienda-pepe --apply`
4. **Cleanup, build, commit per client:**
   - `find ~/Clientes/clientes/educar-sano -name "*.bak-*" -delete`
   - `find ~/Clientes/clientes/tienda-pepe -name "*.bak-*" -delete`
   - `cd ~/Clientes/clientes/educar-sano && pnpm build`
   - `cd ~/Clientes/clientes/tienda-pepe && pnpm build`
   - `git add -A && git commit -m "chore: sync hero additional images fix from agencia"`
   - (same for tienda-pepe)
5. **Bulk sync verification:**
   - `pnpm sync:clients --filter=outdated` (expect both to be `skipped (up-to-date)`)
6. **Bulk update verification:**
   - `pnpm update:clients --filter=outdated` (expect no package.json changes; output will show all skipped)
7. **Final state:** `agencia-backend` working tree shows the two template file changes; client repos have one commit each.

## Risks

- **Low:** the existing template styles use `var(--xxx, fallback)` — same pattern continues. No breaking change for clients.
- **Low:** the Astro template uses `getMediaUrl` for `backgroundImage`; using it for `images` is consistent. The Next.js template does not use it; using raw URL is consistent with the existing pattern. No unification attempted (out of scope).
- **Low:** clients who never override `--hero-image-*` will get the default 120px squares. They can adjust in their own CSS without touching the template.

## Validation Criteria

- `pnpm typecheck` passes in both templates
- `pnpm build` succeeds in `educar-sano` and `tienda-pepe`
- Visual check (manual): a Hero block with `enableImages: true` and 2-3 images shows them in a flex row, centered, with 1rem gap, 120px squares
- A Hero block with `enableImages: false` (or empty `images` array) shows no extra markup
