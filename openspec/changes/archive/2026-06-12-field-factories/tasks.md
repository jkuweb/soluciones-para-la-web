# Tasks: Field Factories

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100–150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR with 2 commit groups |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A (single PR) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Refactor link + linkGroup to use deepMerge | PR 1 (commit group 1) | Self-contained refactor; typecheck validates |
| 2 | Create defaultLexical + apply to 3 blocks | PR 1 (commit group 2) | Depends on fields barrel update from unit 1 |

---

## Phase 1: Refactor link + linkGroup (Work Unit 1)

- [x] 1.1 `src/fields/link.ts` — import `deepMerge` from `@/utilities/deepMerge`; replace lines 140-151 manual spread with `return deepMerge(linkField, overridesRecord) as Field`
- [x] 1.2 `src/fields/linkGroup.ts` — import `deepMerge` from `@/utilities/deepMerge`
- [x] 1.3 `src/fields/linkGroup.ts` — update `LinkGroupOptions` interface to add optional `name?: string` and `label?: string` params
- [x] 1.4 `src/fields/linkGroup.ts` — destructure `name = 'links'` and `label = 'Links'` in the factory function; set them on the base `linkGroupField` object before merge
- [x] 1.5 `src/fields/linkGroup.ts` — replace manual spread override merging with `return deepMerge(linkGroupField, overrides as Record<string, unknown>) as Field`
- [x] 1.6 Validate: `pnpm typecheck` passes with no errors

## Phase 2: Create defaultLexical (Work Unit 2)

- [x] 2.1 Create `src/fields/defaultLexical.ts` — export `defaultLexical` factory wrapping `lexicalEditor()` with `ParagraphFeature`, `BoldFeature`, `ItalicFeature`, `HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] })`, `LinkFeature`, `OrderedListFeature`, `UnorderedListFeature`, `FixedToolbarFeature`, `InlineToolbarFeature`
- [x] 2.2 `src/fields/index.ts` — add `export { defaultLexical } from './defaultLexical'`

## Phase 3: Apply defaultLexical to Blocks (Work Unit 2 continued)

- [x] 3.1 `src/blocks/TextBlock.ts` — import `defaultLexical` from `@/fields`; add `editor: defaultLexical()` to the `content` richText field
- [x] 3.2 `src/blocks/CourseBlock.ts` — import `defaultLexical` from `@/fields`; add `editor: defaultLexical()` to the `description` richText field
- [x] 3.3 `src/blocks/ProductBlock.ts` — import `defaultLexical` from `@/fields`; add `editor: defaultLexical()` to the `description` richText field
- [x] 3.4 Validate: `pnpm typecheck` passes with no errors

## Phase 4: Final Verification

- [x] 4.1 `pnpm lint` — no new warnings or errors
- [x] 4.2 `pnpm test` — no regressions in existing tests
