# restricted-blocks-field Specification

## Purpose

A custom Payload CMS admin component that wraps the native `BlocksField` and conditionally hides structural controls (Add Block, Remove Block, reorder drag handles) when the current user is a `tenant-admin`. Content fields within each block remain fully editable.

## Requirements

### Requirement: Role-aware control visibility

The component MUST use Payload's `useAuth()` hook to determine the current user's role. When the user lacks the `super-admin` role, the component SHALL hide all structural block controls while preserving content field editability.

| User Role | Add Block | Remove Block | Reorder (drag) | Edit Content |
|-----------|-----------|--------------|-----------------|--------------|
| `super-admin` | Visible | Visible | Enabled | Enabled |
| `tenant-admin` | Hidden | Hidden | Disabled | Enabled |
| `tenant-editor` | Hidden | Hidden | Disabled | Enabled |

#### Scenario: Super-admin sees full block controls

- GIVEN a `super-admin` user viewing a page in the Admin UI
- WHEN the `layout` field renders
- THEN the native BlocksField SHALL render with all controls visible: Add Block button, per-block delete buttons, and drag handles

#### Scenario: Tenant-admin sees content-only view

- GIVEN a `tenant-admin` user viewing a page in their tenant
- WHEN the `layout` field renders
- THEN the "Add Block" button SHALL be hidden
- AND remove/delete buttons on each block SHALL be hidden
- AND drag handles for reordering SHALL be disabled or hidden
- AND all content fields inside each block SHALL be editable

#### Scenario: Tenant-admin sees explanatory message

- GIVEN a `tenant-admin` user viewing a page in their tenant
- WHEN the `layout` field renders
- THEN an info banner SHALL display: "La estructura de la página solo puede ser modificada por un super-admin. Puedes editar el contenido de los bloques existentes."

#### Scenario: Field renders correctly in create context

- GIVEN a `super-admin` creating a new page (the only role allowed to create pages)
- WHEN the `layout` field renders
- THEN the full native BlocksField SHALL render (create is super-admin only; no restriction needed)

### Requirement: Component contract

The component SHALL implement Payload's `FieldComponent` interface and SHALL be registered as the `admin.components.Field` for the `layout` field in the `Pages` collection config.

#### Scenario: Component registration

- GIVEN the `Pages` collection config
- WHEN the `layout` field is defined
- THEN the field SHALL include `admin: { components: { Field: RestrictedBlocksField } }` pointing to the custom component

### Requirement: Graceful degradation on auth failure

If `useAuth()` returns `null` or the user object lacks a `roles` array, the component SHALL fall back to hiding structural controls (secure-by-default).

#### Scenario: Auth state unavailable

- GIVEN the Admin UI where `useAuth()` returns `{ user: null }`
- WHEN the `RestrictedBlocksField` renders
- THEN structural controls SHALL be hidden

## UI/UX

| Element | Visibility (super-admin) | Visibility (tenant-admin) |
|---------|--------------------------|---------------------------|
| "Add Block" button | ✅ | ❌ |
| Per-block delete (×) button | ✅ | ❌ |
| Drag handle / reorder grip | ✅ | ❌ |
| Block type label | ✅ | ✅ |
| Content fields | ✅ Editable | ✅ Editable |
| Info banner | ❌ | ✅ |
