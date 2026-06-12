# Proposal: Field Factories

## Intent

Refactor existing field factories (`link`, `linkGroup`) to use the improved `deepMerge` utility instead of manual spread merging, and standardize richText configuration across blocks via a `defaultLexical` factory. This removes duplicated merge logic and provides consistent content editing features across all richText fields.

## Scope

### In Scope
- Unit 1: Refactor `link.ts` and `linkGroup.ts` to use `deepMerge` for override merging
- Unit 1: Add first-class `name` and `label` parameters to `linkGroup` API
- Unit 2: Create `defaultLexical.ts` with basic Lexical editor config (headings h2-h4, bold, italic, link, lists, fixed + inline toolbar)
- Unit 2: Apply `defaultLexical` to `TextBlock`, `CourseBlock`, and `ProductBlock` richText fields

### Out of Scope
- Additional Lexical features (uploads, tables, blocks) — deferred to later change
- Changes to other existing field factories (beyond link/linkGroup)
- Frontend rendering of richText content

## Capabilities

### New Capabilities
- `default-lexical-editor`: Reusable factory for basic Payload Lexical richText config with fixed + inline toolbar

### Modified Capabilities
- None — this is a pure refactor and standardization; no spec-level behavior changes

## Approach

Replace manual `{ ...a, ...b }` spread merging in `link.ts` and `linkGroup.ts` with `deepMerge(linkField, overrides)` and `deepMerge(linkGroupField, overrides)` respectively. Update `linkGroup` to accept `name` and `label` as top-level parameters (defaulting to `links`/`Links` for backward compatibility), passing them into the base field before override merging.

Create `defaultLexical.ts` using `lexicalEditor()` with `FixedToolbarFeature` and `InlineToolbarFeature`, and the specified text formatting nodes. Replace bare `type: 'richText'` in the three blocks with `defaultLexical()` as the `editor` property.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/fields/link.ts` | Modified | Use `deepMerge`; remove manual spread logic |
| `src/fields/linkGroup.ts` | Modified | Use `deepMerge`; add `name`/`label` params |
| `src/fields/index.ts` | Modified | Export `defaultLexical` |
| `src/fields/defaultLexical.ts` | New | Basic Lexical editor factory |
| `src/blocks/TextBlock.ts` | Modified | Add `defaultLexical()` to `content` field |
| `src/blocks/CourseBlock.ts` | Modified | Add `defaultLexical()` to `description` field |
| `src/blocks/ProductBlock.ts` | Modified | Add `defaultLexical()` to `description` field |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Lexical editor feature import mismatch | Low | Use Payload 3.85.1 documented API paths |
| `deepMerge` changes merge behavior subtly | Low | Verify with existing `link()` calls; test coverage exists |
| `linkGroup` API change breaks callers | Low | Keep default name/label; callers using `overrides` still work |

## Rollback Plan

Revert the commit. `link` and `linkGroup` factories remain functional even with manual spread logic. Blocks with bare `richText` work without explicit `editor` config. No data migration required.

## Dependencies

- `src/utilities/deepMerge.ts` — already exists and validated
- `@payloadcms/richtext-lexical` — already part of Payload 3.85.1

## Success Criteria

- [ ] `link.ts` and `linkGroup.ts` use `deepMerge` for all override merging
- [ ] `linkGroup({ name, label })` sets the field name and label directly
- [ ] `defaultLexical` factory exists and is exported from `src/fields/index.ts`
- [ ] `TextBlock`, `CourseBlock`, and `ProductBlock` richText fields use `defaultLexical()`
- [ ] `pnpm typecheck` and `pnpm lint` pass
- [ ] `pnpm test` passes (no regressions)
