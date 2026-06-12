# Design: Field Factories

## Technical Approach

Two independent units: (1) refactor `link`/`linkGroup` to delegate override merging to the existing `deepMerge` utility, and (2) create a standardized Lexical editor preset (`defaultLexical`) and apply it to three blocks. No API surface changes for `link()` consumers; `linkGroup()` gains optional `name`/`label` params with backward-compatible defaults. Zero DB or API changes.

## Architecture Decisions

### Decision: Use deepMerge for field override merging

**Choice**: Replace manual `{ ...base, ...overrides, admin: {...}, fields: ... }` spread with `deepMerge(base, overrides)`.
**Alternatives considered**: Keep manual spread (rejected — duplicates merge semantics already tested in `deepMerge`); use lodash.merge (rejected — adds unnecessary dependency).
**Rationale**: `deepMerge` already handles nested-object recursion, plain-array replacement, and object-array index merging. The `fields` arrays in `link`/`linkGroup` are arrays of Field objects — `deepMerge` merges them by index, which is the correct behavior for override fields. `admin` sub-objects merge recursively. PR #cf5ada0 validated deepMerge with test coverage.

### Decision: linkGroup name/label as first-class params before deepMerge

**Choice**: Add `name` (default `'links'`) and `label` (default `'Links'`) as top-level params. Set them on `linkGroupField` BEFORE `deepMerge(linkGroupField, overrides)`.
**Alternatives considered**: Merge via defaults in `overrides` (rejected — unclear API; `{ overrides: { name: 'x' } }` is worse DX than `{ name: 'x' }`); positional args (rejected — not the project convention).
**Rationale**: Setting on the base object before deepMerge ensures explicit `overrides.name` still wins, maintaining backward compatibility while improving DX for the common case.

### Decision: defaultLexical as a factory function wrapping lexicalEditor

**Choice**: `export const defaultLexical = () => lexicalEditor({...})` — a zero-arg factory.
**Alternatives considered**: Pre-configured constant `const defaultLexical = lexicalEditor({...})` (rejected — proposal calls it a factory, spec uses `defaultLexical()` invocation); feature function `({ defaultFeatures }) => ...` (not needed — we want a fixed subset, not a filtered superset).
**Rationale**: Each block call creates its own `LexicalRichTextAdapterProvider` instance. The feature set is curated to the spec's exact list, not derived from `defaultFeatures`.

## Data Flow

No data flow changes. Field factories build config objects consumed by Payload's config sanitizer at build time.

```
defaultLexical() ──→ lexicalEditor({features, lexical}) ──→ LexicalRichTextAdapterProvider
                              │
              ┌───────────────┼──────────────────┐
              │               │                  │
         TextBlock       CourseBlock        ProductBlock
          content         description        description
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/fields/link.ts` | Modify | Replace lines 140-151 manual spread with `deepMerge(linkField, overridesRecord)` |
| `src/fields/linkGroup.ts` | Modify | Add `name`/`label` params; replace manual spread with `deepMerge`; import `deepMerge` |
| `src/fields/defaultLexical.ts` | **Create** | Factory exporting `defaultLexical`, configured with h2-h4, bold, italic, link, ol, ul, fixed+inline toolbar |
| `src/fields/index.ts` | Modify | Add `export { defaultLexical } from './defaultLexical'` |
| `src/blocks/TextBlock.ts` | Modify | Add `editor: defaultLexical` to `content` field |
| `src/blocks/CourseBlock.ts` | Modify | Add `editor: defaultLexical` to `description` field |
| `src/blocks/ProductBlock.ts` | Modify | Add `editor: defaultLexical` to `description` field |

## Interfaces / Contracts

### defaultLexical factory signature

```typescript
// src/fields/defaultLexical.ts
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import {
  BoldFeature,
  ItalicFeature,
  HeadingFeature,
  LinkFeature,
  OrderedListFeature,
  UnorderedListFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  ParagraphFeature,
} from '@payloadcms/richtext-lexical'

export const defaultLexical = () =>
  lexicalEditor({
    features: [
      ParagraphFeature(),
      BoldFeature(),
      ItalicFeature(),
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
      LinkFeature(),
      OrderedListFeature(),
      UnorderedListFeature(),
      FixedToolbarFeature(),
      InlineToolbarFeature(),
    ],
  })
```

**Feature rationale**:
- `ParagraphFeature()` — required; Lexical needs a paragraph node as its root block element
- `HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] })` — h1 excluded per spec
- `FixedToolbarFeature()` — adds the fixed (always-visible) toolbar (NOT included in default features; must be explicitly imported)
- `InlineToolbarFeature()` — adds the floating toolbar on text selection
- No `AlignFeature`, `IndentFeature`, `ChecklistFeature`, `RelationshipFeature`, `UploadFeature`, etc. — out of scope per proposal

### linkGroup updated signature

```typescript
export const linkGroup = ({
  name = 'links',
  label = 'Links',
  disableLabel = false,
  overrides = {},
  appearances,
}: LinkGroupOptions = {}): Field => {
  const linkGroupField: Field = {
    name,
    label,
    type: 'array',
    admin: { initCollapsed: true },
    fields: [link({ disableLabel, appearances })],
  }
  return deepMerge(linkGroupField, overrides as Record<string, unknown>) as Field
}
```

### link refactor (signature unchanged)

```typescript
// Only the merge block changes — remove lines 140-151, replace with:
return deepMerge(linkField, overridesRecord) as Field
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `deepMerge` behavior with Field-shaped objects | Existing `deepMerge.int.spec.ts` already covers nested merge, array replacement, and undefined handling — sufficient |
| Unit | `defaultLexical` returns configured editor | Manual verification via `pnpm dev` — visual check that all 3 blocks render the toolbar with h2-h4, bold, italic, link, ol, ul |
| Integration | `link()` and `linkGroup()` produce identical configs after refactor | Run existing tests (no link/linkGroup-specific tests exist yet; verify via `pnpm typecheck` that signatures don't change) |

No new test files required — this is a pure refactor and configuration change. Existing deepMerge tests prove the merge semantics.

## Migration / Rollout

No migration required. The refactor preserves exact config output. Existing consumers of `link()` and `linkGroup()` work unchanged. Blocks with bare `type: 'richText'` silently receive the Lexical adapter via `payload.config.ts` line 29; this change makes it explicit per-field with a curated feature set.

## Open Questions

- None. Feature imports verified against `@payloadcms/richtext-lexical` v3.85.1 dist. Merge behavior validated by existing `deepMerge` test suite.
