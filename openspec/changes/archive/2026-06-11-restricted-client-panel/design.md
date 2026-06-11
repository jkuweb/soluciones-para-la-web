# Design: Restricted Client Panel

## Technical Approach

Two-layer defense: a server-side `beforeChange` hook on `Pages` validates structural immutability of the `layout` field for non-super-admins (authoritative), and a custom admin component (`RestrictedBlocksField`) wraps `BlocksField` from `@payloadcms/ui` to hide Add/Remove/Reorder controls in the UI (UX layer). The hook is the security boundary; the component is convenience.

Reference: `docs/superpowers/specs/2026-06-08-agencia-saas-design.md` (multi-tenant roles).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `beforeChange` hook (has `originalDoc`) vs `beforeValidate` (earlier, no original) | `beforeValidate` doesn't expose `originalDoc` — can't compare old vs new structure | **`beforeChange`** — necessary for structural diff |
| Wrap native `BlocksField` vs build custom blocks UI from scratch | Custom UI is fragile on Payload upgrades, high maintenance | **Wrap `BlocksField`** — use CSS `display:none` on action buttons/drag handles |
| Check `user.roles.includes('super-admin')` vs permission-based check | Permissions system not yet granular for structure control | **Role check** — matches existing patterns in `payload.config.ts` and `Pages.ts` access control |
| If `useAuth()` returns null, show controls vs hide controls | Showing controls to an unidentified user is a security gap | **Hide controls** — secure-by-default per spec NFR5 |

## Data Flow

```
Admin UI                          Backend
────────                          ───────
RestrictedBlocksField             beforeChange hook
  │                                 │
  ├─ useAuth() → {user}             ├─ user.roles? super-admin → skip
  │  ├─ tenant-admin → hide UI      │
  │  └─ super-admin → show UI       ├─ data.layout vs originalDoc.layout
  │                                 │  ├─ IDs match, types match, order match → pass
  │                                 │  └─ any diff → reject (400)
  │                                 │
  └─ Content fields → editable ✓    └─ Returns error → API rejects
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/validateLayoutStructure.ts` | **Create** | `beforeChange` hook: compares `data.layout` vs `originalDoc.layout`, rejects structural changes for non-super-admins |
| `src/components/RestrictedBlocksField.tsx` | **Create** | Client component wrapping `BlocksField` from `@payloadcms/ui`; uses `useAuth()` to detect role; applies CSS to hide `.blocks-drawer__toggler`, per-block `__actions`, drag handles for tenant-admin |
| `src/components/RestrictedBlocksField.css` | **Create** | Vanilla CSS: hides structural controls via `.role-tenant-admin` class on wrapper |
| `src/collections/Pages.ts` | **Modify** | Add `hooks: { beforeChange: [validateLayoutStructure] }` and `admin.components.Field` on the `layout` field pointing to `RestrictedBlocksField` |
| `src/collections/Users.ts` | **Modify** | Add role descriptions clarifying permissions (super-admin: full CRUD, tenant-admin: content-only, tenant-editor: future) |

## Interfaces / Contracts

**Hook error response** (returned to API client on structural violation):

```typescript
// Thrown via Payload API error — no custom type needed
{
  errors: [{
    message: "Page structure changes are restricted to super-admin users. You cannot add, remove, or reorder blocks.",
    path: ["layout"]
  }]
}
```

**Custom Field Component contract:**

```typescript
// Implements Payload's FieldComponent interface for blocks type
// Registered via admin.components.Field on the layout field
import { BlocksField } from '@payloadcms/ui'
import { useAuth } from '@payloadcms/ui/providers/Auth'

// Props: standard BlocksField client props from Payload
// Behavior: passes through all props, wraps in div with data-role attribute
// CSS hides .blocks-drawer__toggler, per-block delete buttons, drag handles
// Shows info banner when controls hidden
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Hook rejects structure changes for tenant-admin | Vitest: create page as super-admin, attempt update as tenant-admin with modified layout. Assert 400. |
| Integration | Hook allows content edits for tenant-admin | Vitest: update text field inside existing block as tenant-admin. Assert 200. |
| Integration | Super-admin bypasses hook | Vitest: super-admin adds/removes/reorders blocks. Assert 200. |
| Integration | Non-layout changes (title, status) pass for tenant-admin | Vitest: update title only. Assert 200. |

## Migration / Rollout

No migration required. Existing pages continue functioning. The hook only runs on update operations. New component respects existing block definitions.

Rollback: remove `hooks` array from `Pages.ts`, delete new files, restore `Users.ts` — zero data impact.

## Open Questions

None — all technical unknowns resolved via codebase inspection and Payload 3.85.1 type definitions.
