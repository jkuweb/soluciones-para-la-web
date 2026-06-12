# Exploration: Link Field Factories & defaultLexical

**Date:** 2026-06-12
**Author:** AI Agent
**Context:** Preparation for implementing/refining `link()`, `linkGroup()` field factories and creating a `defaultLexical.ts` standardized editor config.

---

## 1. Current State of `agencia-backend/src/fields/`

The directory already exists with three files:

### `src/fields/link.ts` (152 lines)
- A complete `link()` factory function
- **Appearance types:** `'default' | 'outline'` (only 2)
- **Options:**
  - `disableLabel` (boolean) — hides the label field
  - `overrides` (Partial\<GroupField\>) — overrides for name, admin props, etc.
  - `appearances` (LinkAppearances[] | false) — set to `false` to hide, or pass subset
- **Fields produced (group):**
  - `type` (radio: `reference` | `custom`)
  - `newTab` (checkbox)
  - `reference` (relationship to `pages`, conditional on `type === 'reference'`)
  - `url` (text, conditional on `type === 'custom'`)
  - `label` (text, conditional on `!disableLabel`)
  - `appearance` (select, conditional on `appearances !== false`)
- **Override merge:** Uses manual spread (`{ ...linkField, ...overridesRecord }`) — NOT using `deepMerge`
- **No `icon` field** (intentional, scope simplification)

### `src/fields/linkGroup.ts` (52 lines)
- A `linkGroup()` factory wrapping `link()` in an array field
- **Options:**
  - `disableLabel` (passed to `link()` correctly)
  - `overrides` (Partial\<Field\>)
  - `appearances` (passed to `link()`)
- **Fields produced (array):**
  - Each item is a `link()` group
- **Override merge:** Also manual spread (not using `deepMerge`)
- **Note:** Does NOT accept `name` or `label` via options — relies entirely on `overrides`

### `src/fields/index.ts` (2 lines)
- Simply re-exports both factories:
  ```ts
  export { link } from './link'
  export { linkGroup } from './linkGroup'
  ```

---

## 2. Where Link Fields Are Currently Used

### In Blocks (agencia-backend)

| Block | Usage | Customizations |
|---|---|---|
| `HeroBlock.ts` | `link({ overrides: { name: 'cta', label: 'Call to Action Link' } })` | Name overridden to `cta` |
| `FooterBlock.ts` | `linkGroup({ overrides: { name: 'socialLinks', label: 'Social Links' } })` | Name overridden to `socialLinks` |

Blocks that do NOT use links: `TextBlock`, `ImageBlock`, `ContactBlock`, `MenuBlock` (restaurant menu), `CartBlock`, `CourseBlock`, `ProductBlock`.

### In Globals (agencia-backend)

| Global | Usage | Customizations |
|---|---|---|
| `Header/config.ts` | `link({ appearances: false })` inside `navItems` array | No appearance field |
| `Footer/config.ts` | `link({ appearances: false })` inside `navItems` array | No appearance field |
| `Footer/config.ts` | `link({ disableLabel: true })` inside `socialLinks` array | No label field |

### Summary of Link Usage

The link factory is already used in 5 places with different overrides. No link fields are defined inline — they ALL use the factory. **No duplication exists.**

---

## 3. Reference Template (`/home/joseba/Clientes/agencia/src/`)

A Payload Website Template reference exists at the repo root. Key differences:

### Reference `link.ts` vs agencia-backend `link.ts`

| Feature | Reference (`src/fields/link/link.ts`) | Agencia (`agencia-backend/src/fields/link.ts`) |
|---|---|---|
| **Appearances** | 7: default, primary, secondary, tertiary, outline, ghost, link | 2: default, outline |
| **Icon field** | Yes: `icon` (upload, relationTo media) | No |
| **Merge strategy** | `deepMerge()` utility | Manual spread |
| **Label layout** | In a row with reference/url (50% width each) | Standalone field |
| **File location** | `src/fields/link/link.ts` | `src/fields/link.ts` |

### Reference `linkGroup.ts` vs agencia-backend `linkGroup.ts`

| Feature | Reference | Agencia |
|---|---|---|
| **disableLabel** | Not an option | Option exists |
| **Merge strategy** | `deepMerge()` utility | Manual spread |
| **Label** | Hardcoded `'Enlaces'` | No hardcoded label |

### Key observation
The reference template's link factory is more elaborate (7 appearances, icon field). The agencia-backend version is simplified (2 appearances, no icon). Both are valid — the agencia version was intentionally simplified. **However, the agencia version should use `deepMerge` for consistency** since the utility already exists at `src/utilities/deepMerge.ts`.

---

## 4. Lexical / Rich Text Configuration

### Current State

**Global editor config** in `payload.config.ts`:
```ts
editor: lexicalEditor()  // Stock config, NO custom features
```

**Blocks using `type: 'richText'`** (all use default editor, no per-block customization):

| Block | Field | Notes |
|---|---|---|
| `TextBlock.ts` | `content` | `{ type: 'richText' }` |
| `CourseBlock.ts` | `description` | `{ type: 'richText' }` |
| `ProductBlock.ts` | `description` | `{ type: 'richText' }` |

### Reference Template Patterns

The reference template never uses the global default — instead it passes inline `lexicalEditor()` configs with features:
```ts
editor: lexicalEditor({
  features: ({ rootFeatures }) => {
    return [
      ...rootFeatures,
      HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
      FixedToolbarFeature(),
      InlineToolbarFeature(),
    ]
  },
}),
```

Pattern appears in: Content block, CTA block, List block, Banner block, Hero config.

**No shared/centralized `defaultLexical` exists in either project.**

### Rich Text Usage Summary

- **No file named `defaultLexical`** exists anywhere in the repo.
- All 3 rich text fields in `agencia-backend` use the bare `{ type: 'richText' }` default.
- The reference template repeats the same feature set inline 5 times — a centralized `defaultLexical` would DRY this.

---

## 5. Access & Utilities Patterns (for consistency reference)

### `src/access/` (4 files)
- `anyone.ts` — returns `true`
- `authenticated.ts` — returns `Boolean(req.user)`
- `authenticatedOrPublished.ts` — authenticated sees all, public sees only published
- `tenantAccess.ts` — factory returning tenant-constrained access function

### `src/utilities/` (3 files)
- `deepMerge.ts` — recursive merge used by the reference template's link factory
- `getURL.ts` — server URL resolution
- `resolveTenantIds.ts` — tenant ID extraction from user object

---

## 6. Recommendations

### A. `link()` Factory — Minor Refinements

The existing factory is solid. Recommended changes:

1. **Use `deepMerge` instead of manual spread** for override merging (consistency with reference template and the already-existing utility).
2. **Keep 2 appearances** (default, outline) — this is intentional for the project scope.
3. **No `icon` field** — intentionally omitted. Add only if a block explicitly needs it.
4. **No behavioral changes needed** — the API is already aligned with the Payload Website Template pattern.

### B. `linkGroup()` Factory — Minor Refinements

1. **Use `deepMerge`** instead of manual spread.
2. **Accept `name` and `label`** as explicit options instead of relying on `overrides` — makes API cleaner:
   ```ts
   linkGroup({ name: 'socialLinks', label: 'Social Links' })
   // instead of
   linkGroup({ overrides: { name: 'socialLinks', label: 'Social Links' } })
   ```
3. Add `fields` option to allow injecting additional fields alongside links. (Optional, lower priority.)

### C. `defaultLexical.ts` — New File

Create `src/fields/defaultLexical.ts` exporting a standardized Lexical editor config:

```ts
import { lexicalEditor, HeadingFeature, FixedToolbarFeature, InlineToolbarFeature } from '@payloadcms/richtext-lexical'

export const defaultLexical = lexicalEditor({
  features: ({ rootFeatures }) => {
    return [
      ...rootFeatures,
      HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
      FixedToolbarFeature(),
      InlineToolbarFeature(),
    ]
  },
})
```

This centralizes the common pattern and eliminates duplication. Blocks that need different features can still pass their own `lexicalEditor()` config.

### D. Update existing blocks that use richText

Update `TextBlock.ts`, `CourseBlock.ts`, `ProductBlock.ts` to use `defaultLexical`:
```ts
import { defaultLexical } from '@/fields/defaultLexical'

// In block fields:
{
  name: 'content',  // or 'description'
  type: 'richText',
  editor: defaultLexical,
}
```

---

## 7. Summary of Files to Create/Modify

### Files to CREATE:
| File | Purpose |
|---|---|
| `agencia-backend/src/fields/defaultLexical.ts` | Centralized Lexical editor config |

### Files to MODIFY:
| File | Change |
|---|---|
| `agencia-backend/src/fields/link.ts` | Use `deepMerge` for overrides |
| `agencia-backend/src/fields/linkGroup.ts` | Use `deepMerge` for overrides; add `name`/`label` options |
| `agencia-backend/src/blocks/TextBlock.ts` | Use `defaultLexical` for `content` field |
| `agencia-backend/src/blocks/CourseBlock.ts` | Use `defaultLexical` for `description` field |
| `agencia-backend/src/blocks/ProductBlock.ts` | Use `defaultLexical` for `description` field |

### Files that need NO changes:
| File | Reason |
|---|---|
| `agencia-backend/src/fields/index.ts` | Already re-exports correctly |
| `agencia-backend/src/blocks/HeroBlock.ts` | Already uses `link()` correctly |
| `agencia-backend/src/blocks/FooterBlock.ts` | Already uses `linkGroup()` correctly |
| `agencia-backend/src/blocks/MenuBlock.ts` | No link or richText fields |
| `agencia-backend/src/blocks/ImageBlock.ts` | No link or richText fields |
| `agencia-backend/src/blocks/ContactBlock.ts` | No link or richText fields |
| `agencia-backend/src/blocks/CartBlock.ts` | No link or richText fields |
| `agencia-backend/src/globals/Header/config.ts` | Already uses `link()` correctly |
| `agencia-backend/src/globals/Footer/config.ts` | Already uses `link()` correctly |
| `agencia-backend/src/payload.config.ts` | Stock `lexicalEditor()` becomes the fallback default; no change needed |

---

## 8. Estimated Effort

| Task | Est. time | Complexity |
|---|---|---|
| Create `defaultLexical.ts` | 5 min | Low |
| Refine `link.ts` (deepMerge) | 10 min | Low |
| Refine `linkGroup.ts` (deepMerge + name/label) | 15 min | Low |
| Update TextBlock, CourseBlock, ProductBlock | 5 min | Low |
| **Total** | **~35 min** | **Low** |

The factories are already functional and in use. These are polish/standardization changes.
