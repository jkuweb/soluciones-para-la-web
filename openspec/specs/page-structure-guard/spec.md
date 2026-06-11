# page-structure-guard Specification

## Purpose

Enforce structural immutability of the `layout` blocks field on the `Pages` collection for non-super-admin users. A `tenant-admin` MUST be able to edit content within existing blocks but MUST NOT add, remove, or reorder blocks.

## Requirements

### Requirement: Block structure validation on update

The `Pages` collection `beforeChange` hook SHALL compare the incoming `layout` array against the original document's `layout`. If the user is not `super-admin` and any structural difference is detected, the hook MUST reject the operation with a descriptive validation error.

Structural differences are defined as:
- Block count differs from the original
- Any block's `id` differs from the original at the same positional index
- Any block's `blockType` differs from the original at the same positional index
- Block order differs from the original (IDs in different positions)

Content-only changes (field values within a block whose `id` and `blockType` match the original at the same index) SHALL be permitted.

#### Scenario: Tenant-admin edits block content successfully

- GIVEN a `tenant-admin` user with update access to a page in their tenant
- AND the page has `layout: [{id: "abc", blockType: "text", content: "old"}]`
- WHEN the user submits an update with `layout: [{id: "abc", blockType: "text", content: "new"}]`
- THEN the hook SHALL pass validation and the update SHALL succeed

#### Scenario: Tenant-admin attempts to add a block

- GIVEN a `tenant-admin` user with update access to a page in their tenant
- AND the page has 2 layout blocks
- WHEN the user submits an update with 3 layout blocks
- THEN the hook SHALL reject the operation with error: "Page structure changes are restricted to super-admin users. You cannot add, remove, or reorder blocks."

#### Scenario: Tenant-admin attempts to remove a block

- GIVEN a `tenant-admin` user with update access to a page in their tenant
- AND the page has 2 layout blocks
- WHEN the user submits an update with 1 layout block
- THEN the hook SHALL reject the operation with the same structure-restriction error

#### Scenario: Tenant-admin attempts to reorder blocks

- GIVEN a `tenant-admin` user with update access to a page in their tenant
- AND the page has `layout: [{id: "a"}, {id: "b"}]`
- WHEN the user submits `layout: [{id: "b"}, {id: "a"}]`
- THEN the hook SHALL reject the operation with the same structure-restriction error

#### Scenario: Super-admin retains full structural control

- GIVEN a `super-admin` user
- WHEN the user submits any layout change (add, remove, reorder, or content edit)
- THEN the hook SHALL pass validation unconditionally and the update SHALL succeed

#### Scenario: Super-admin creates page with blocks

- GIVEN a `super-admin` user
- WHEN the user creates a new page with 3 layout blocks
- THEN the hook SHALL pass validation (new document has no original to compare) and the create SHALL succeed

#### Scenario: Hook cannot be bypassed via direct API

- GIVEN a `tenant-admin` attempting to call the REST API directly with manipulated payload
- WHEN the request reaches the `beforeChange` hook server-side
- THEN the hook SHALL execute and validate regardless of request origin (API or Admin UI)

### Requirement: Hook applies only to `layout` field

The `beforeChange` hook SHALL only validate the `layout` field. Other fields (`title`, `slug`, `status`, `meta`) SHALL NOT be restricted by this hook. Existing collection-level access control continues to govern those fields.

#### Scenario: Tenant-admin changes page metadata

- GIVEN a `tenant-admin` user with update access
- WHEN the user changes only the `title` or `meta` field without touching `layout`
- THEN the hook SHALL pass validation

## Validation Rules

| Rule | Condition | Action |
|------|-----------|--------|
| Super-admin bypass | `user.roles` includes `super-admin` | Skip all validation |
| Layout length mismatch | `data.layout.length !== original.layout.length` | Reject |
| Block ID mismatch at index | `data.layout[i].id !== original.layout[i].id` | Reject |
| Block type mismatch at index | `data.layout[i].blockType !== original.layout[i].blockType` | Reject |
| Layout absent in both | `!data.layout && !original.layout` | Pass (no structure to protect) |
| New document (no original) | `!originalDoc` (create operation) | Pass (super-admin-only create is enforced by collection access) |

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Structure change by non-super-admin | 400 | "Page structure changes are restricted to super-admin users. You cannot add, remove, or reorder blocks." |

The error SHALL include `field: "layout"` to highlight the offending field in the Admin UI.
