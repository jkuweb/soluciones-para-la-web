# Field Factories Specification

## Purpose

Reusable Payload CMS field factories: standardized Lexical rich-text configuration via `defaultLexical`, and internal refactoring of link/linkGroup override merging using `deepMerge`.

## Requirements

### Requirement: Default Lexical Editor Factory

The system MUST export a `defaultLexical` factory from `src/fields/defaultLexical.ts` producing a Payload Lexical richText editor config. It SHALL include: headings h2, h3, h4; bold; italic; links; ordered and unordered lists; fixed toolbar; and inline toolbar. It SHALL NOT include h1 as a heading option.

#### Scenario: Toolbar renders all required features

- GIVEN a block field using `editor: defaultLexical`
- WHEN the Payload admin renders the richText editor
- THEN the fixed toolbar SHALL expose h2, h3, h4, bold, italic, link, ol, ul
- AND the inline toolbar SHALL appear on text selection
- AND h1 SHALL NOT appear as a heading choice

#### Scenario: Factory is importable from fields barrel

- GIVEN `src/fields/index.ts` re-exports `defaultLexical`
- WHEN another module imports from `@/fields`
- THEN `defaultLexical` SHALL be accessible alongside `link` and `linkGroup`

### Requirement: Blocks use defaultLexical for richText fields

TextBlock `content`, CourseBlock `description`, and ProductBlock `description` MUST use `defaultLexical()` as their `editor` instead of bare `type: 'richText'`.

| Block | Field | Change |
|-------|-------|--------|
| TextBlock | `content` | `editor: defaultLexical` |
| CourseBlock | `description` | `editor: defaultLexical` |
| ProductBlock | `description` | `editor: defaultLexical` |

#### Scenario: All three blocks render standardized toolbar

- GIVEN the TextBlock, CourseBlock, and ProductBlock configurations
- WHEN any of their richText fields render in the admin UI
- THEN each SHALL display the same fixed toolbar (h2-h4, bold, italic, link, lists)
- AND each SHALL activate the inline toolbar on text selection

### Requirement: Link field override merging uses deepMerge

The `link()` factory MUST use `deepMerge` instead of manual spread merging for applying consumer overrides. Existing consumers SHALL work identically without code changes.

#### Scenario: Override merges with deepMerge preserving defaults

- GIVEN `link({ overrides: { name: 'cta', label: 'Call to Action' } })`
- WHEN the factory applies overrides
- THEN `deepMerge` SHALL be invoked
- THEN `name` SHALL be `'cta'` and `label` SHALL be `'Call to Action'`
- AND `admin.hideGutter: true` SHALL be preserved when not overridden

### Requirement: LinkGroup first-class name and label parameters

The `linkGroup()` factory MUST accept `name` (default `'links'`) and `label` (default `'Links'`) as top-level parameters. Override merging MUST use `deepMerge`. Existing consumers with `overrides.name`/`overrides.label` SHALL continue to work.

#### Scenario: Explicit name and label set field identity

- GIVEN `linkGroup({ name: 'socialLinks', label: 'Social Links' })`
- WHEN the factory builds the array field
- THEN `name` SHALL be `'socialLinks'` and `label` SHALL be `'Social Links'`

#### Scenario: Defaults preserved when omitted

- GIVEN `linkGroup({ disableLabel: true })`
- WHEN the factory builds the array field
- THEN `name` SHALL default to `'links'` and `label` SHALL default to `'Links'`
- AND `disableLabel` SHALL be forwarded to the inner `link()` call

#### Scenario: Overrides still merged when no top-level params

- GIVEN `linkGroup({ overrides: { name: 'navItems' } })`
- WHEN the factory builds the array field
- THEN `name` SHALL be `'navItems'` (from overrides, merged via `deepMerge`)
