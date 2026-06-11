# Proposal: Restricted Client Panel

## Intent
Prevent `tenant-admin` users from modifying page structure (adding, removing, or reordering blocks) while allowing them to edit block content. The current `layout` blocks field grants full structural control to any user with `update` access, which breaks the super-admin/tenant-admin separation of concerns.

## Scope

### In Scope
- Backend `beforeChange` hook on `Pages` that rejects structural changes for non-super-admins
- Custom `RestrictedBlocksField` admin component that hides block add/remove/reorder controls for tenant-admins
- Role matrix documentation and access clarification in `Users` collection

### Out of Scope
- Granular `tenant-editor` permissions (future phase)
- Frontend client template changes (Astro/Next.js)
- API-level field-level access control (handled by existing multi-tenant plugin)

## Capabilities

### New Capabilities
- `restricted-blocks-field`: Custom Payload admin component that conditionally renders block controls based on user role

### Modified Capabilities
- `page-structure-guard`: `Pages` collection gains a `beforeChange` hook enforcing structural immutability for non-super-admins

## Approach
- **Backend**: Add a `beforeChange` hook to `Pages` that compares incoming `layout` against the original document. If the user is not `super-admin`, reject the operation if block IDs, block types, or order differ.
- **Admin UI**: Create a `RestrictedBlocksField` React component that wraps the native `BlocksField`. It uses `useAuth` to detect role. If `tenant-admin`, it passes CSS/config overrides to hide structural controls while preserving content fields.
- **Roles**: Update `Users` collection comments/docs to clarify: `super-admin` (full CRUD), `tenant-admin` (content-only update), `tenant-editor` (future granular permissions).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/collections/Pages.ts` | Modified | Add `beforeChange` hook and custom component reference for `layout` field |
| `src/collections/Users.ts` | Modified | Clarify role descriptions and access matrix |
| `src/components/RestrictedBlocksField.tsx` | New | Custom admin component wrapping `BlocksField` |
| `src/hooks/` | New | Directory for reusable `beforeChange` hooks |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hook bypass via direct API call | Low | Hook runs server-side on every update; validation is authoritative |
| UI component breaks on Payload upgrade | Med | Isolate custom component, monitor changelogs, pin Payload version |
| Tenant-admin confusion about disabled controls | Low | Add inline helper text explaining why structure is locked |

## Rollback Plan
1. Revert `Pages.ts` to remove `beforeChange` hook and custom component reference.
2. Delete `RestrictedBlocksField.tsx` and `src/hooks/` (if no other hooks exist).
3. Restore `Users.ts` to previous state.

## Dependencies
- None (all internal to existing Payload setup)

## Success Criteria
- [ ] `tenant-admin` can edit text inside a `TextBlock` but cannot add/remove/reorder blocks
- [ ] `super-admin` retains full structural control over `layout`
- [ ] API returns a clear validation error when a non-super-admin attempts structural changes

## Non-goals
- Granular permissions per block type for `tenant-editor`
- Drag-and-drop restriction for tenant-admin (we hide controls, not disable DnD if native)
- Changes to frontend rendering or client project templates

## Ready for Spec
Yes
