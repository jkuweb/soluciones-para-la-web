## Exploration: Restricted Client Panel

### Current State

The Agencia SaaS backend is a **Payload CMS 3.85.1** instance with a multi-tenant plugin isolating `pages` and `media` collections by tenant. The key architectural pieces:

**1. Pages Collection (`src/collections/Pages.ts`)**
- The `layout` field is a `blocks` type containing 9 registered blocks: `HeroBlock`, `TextBlock`, `ImageBlock`, `ContactBlock`, `MenuBlock`, `ProductBlock`, `CartBlock`, `CourseBlock`, `FooterBlock`.
- Access control allows `super-admin` full CRUD, and `tenant-admin`/`tenant-editor` can read/update only their own tenant's pages via `user.tenants` mapping.
- **No field-level access control** on the `layout` field currently.
- **No custom components** on the `layout` field.

**2. Users & Roles (`src/collections/Users.ts`)**
- Three roles: `super-admin`, `tenant-admin`, `tenant-editor`.
- The `tenant-admin` role exists but is not yet functionally differentiated from `tenant-editor` in the current access control.
- The multi-tenant plugin assigns `user.tenants` array automatically.

**3. Multi-tenant Plugin (`src/payload.config.ts`)**
- Isolates `pages` and `media` by tenant slug.
- `userHasAccessToAllTenants` returns true only for `super-admin`.
- Tenant selection is handled via `TenantSelector` RSC component.

**4. Frontend Rendering (Astro & Next.js)**
- Both frontends use a **switch/map pattern** to render blocks by `blockType`.
- They consume the Payload REST API with `where[tenant.slug][equals]=<tenant>`.
- Adding a new block in the backend requires adding a new component in both frontend projects.
- Adding a new field to an existing block automatically appears in the frontend `data` prop because the block object is passed wholesale.

**5. Custom Admin Components**
- No custom admin components exist yet. The admin UI is 100% Payload's default.
- The `importMap` only contains plugin-generated components (multi-tenant, lexical).
- The `custom.scss` is empty.

### Affected Areas
- `src/collections/Pages.ts` — The `layout` field needs restricted editing for tenant editors.
- `src/collections/Users.ts` — May need to refine the role distinction (tenant-admin vs tenant-editor).
- `src/payload.config.ts` — Admin customizations for components.
- `src/app/(payload)/admin/` — New custom components for the restricted block editor.
- `src/hooks/` (new) — `beforeChange` hooks to enforce structural integrity on the server.
- `astro-starter` / `nextjs-starter` — No backend changes needed here, but frontend teams need to be aware of new block types.

### Approaches

1. **Custom Block Component + Field-level Access (Recommended)**
   - Replace the default `blocks` field component with a custom React component that reads the user's role and hides the "Add Block", "Remove Block", and "Reorder" controls for `tenant-editor` users.
   - Use Payload's `admin.components.Field` on the `layout` field to inject a custom block editor.
   - Add a `beforeChange` hook on the `Pages` collection to validate that the `layout` structure hasn't been modified (block count, order, types) for non-super-admin users.
   - Pros: Clean UX in the admin, the editor sees the same interface but with restricted controls. Leverages Payload's native component system. Backend validation is robust.
   - Cons: Requires building a custom React component that wraps or replicates the native block editor. Payload 3's custom component API for `blocks` is complex and may require deep diving into the internal UI.
   - Effort: **High**

2. **Separate Admin View / Custom Page ("Dashboard" approach)**
   - Build a custom admin page (e.g., `/admin/client-panel`) that renders a simplified UI using Payload's `useDocumentInfo` or `useForm` hooks.
   - This page would fetch the page and render only the fields of each block in a flat form, without the block abstraction.
   - Pros: Complete control over the UI. Very safe because the client never touches the `blocks` array directly.
   - Cons: Requires significant frontend dev. The UI diverges from the super-admin experience. If a new block is added, the custom panel must be updated manually. Complex to maintain.
   - Effort: **Very High**

3. **CSS-only / DOM manipulation (Quick & Dirty)**
   - Use custom CSS or a client-side JS script to hide the block controls based on the user's role.
   - Add a strict `beforeChange` hook to enforce structure on the server.
   - Pros: Fast to implement, minimal custom React code.
   - Cons: Fragile. CSS selectors can break with Payload updates. Not truly secure, only obfuscation. Poor UX (controls might flicker or be partially accessible).
   - Effort: **Low** (but not recommended)

4. **Two Separate Collections (Structure vs. Content)**
   - Split the concept: a `PageTemplates` collection (super-admin only) defines the layout and blocks. A `PageContent` collection (tenant-editor) only edits the fields within the blocks.
   - Pros: Very clear separation of concerns. The client literally cannot touch the structure.
   - Cons: Major architectural change. Duplicate data. Complex to sync. Breaks the current simplicity.
   - Effort: **Very High**

5. **Payload `fieldAccess` + `beforeChange` Hook (Hybrid)**
   - Use Payload's `access` on the `layout` field itself to make it `read` for all and `update` only for `super-admin`. For `tenant-editor`, provide a separate `admin` custom component that renders the blocks in a "read-only structure, editable content" mode.
   - This is essentially a refinement of Approach 1, but using field-level access to make the native `blocks` field completely read-only for the client, and then providing a custom component for the content editing.
   - Pros: Secure at the API level. Custom UI is only for content editing.
   - Cons: Requires two fields or a very clever custom component.
   - Effort: **Medium-High**

### Recommendation

**Adopt Approach 1 (Custom Block Component + Field-level Access)**, but with a pragmatic implementation path:

1. **Phase 1 (Backend Safety)**: Implement a `beforeChange` hook on the `Pages` collection that compares the incoming `layout` against the existing document's `layout`. If the user is NOT `super-admin`, the hook must ensure:
   - The `blockType` list is identical (no additions, no removals).
   - The order of blocks is identical.
   - The `id` of each block is identical.
   - If the structure is changed, reject the update or silently discard the structural changes.

2. **Phase 2 (Admin UX)**: Create a custom field component (`RestrictedBlocksField`) that wraps the default `blocks` field. The component should:
   - Detect the current user's role via `useAuth` or the `user` object.
   - If `tenant-editor`, hide the `AddBlockButton`, `RemoveBlockButton`, and drag handles.
   - Keep all field inputs within each block fully editable.
   - This component is assigned to the `layout` field's `admin.components.Field`.

3. **Phase 3 (Role Differentiation)**: Clarify the `tenant-admin` role. If the client should be `tenant-editor`, ensure that `tenant-admin` is reserved for a client who CAN manage users, but not structure. Update `access` control accordingly.

### Risks

- **Payload 3 Blocks Custom Component Complexity**: The `blocks` field is one of the most complex fields in Payload. Customizing its UI component to hide only structural controls while keeping field inputs editable is non-trivial and may require copying significant internal logic from Payload's source.
- **Silent Failure**: If the `beforeChange` hook silently discards structural changes instead of throwing an error, it could lead to confusion. The hook should throw a clear error or log it.
- **Frontend Component Registration**: The current frontends (Astro and Next.js) use a hardcoded map of `blockType` to component. Adding a new block in the backend does NOT automatically make it appear in the frontend. The client will see it in the admin panel, but the frontend won't render it. This is an existing architectural gap that needs documentation or a dynamic component loader.
- **Tenant-Admin Ambiguity**: The `tenant-admin` role exists but isn't functionally used. We need to decide if this role can also edit structure or if it should be restricted to user management.

### Ready for Proposal

**Yes.**

The orchestrator should tell the user that we have a clear path forward, but we need to decide on the **Role Definition** (what can `tenant-admin` do vs `tenant-editor`?) and whether we want to tackle the **Backend Safety** first (hook) before the **Admin UX** (custom component), or both in parallel.

The user should also be aware that **frontend rendering** of new blocks requires manual registration in the Astro/Next.js projects — this is out of scope for the backend change but is a critical part of the "client sees new block" workflow.

### Next Steps

1. Propose a `beforeChange` hook for `Pages` collection to enforce structural integrity.
2. Investigate Payload 3's internal `blocks` field component to determine if we can override sub-components (Add/Remove/Drag handles) without rewriting the entire field.
3. Design the custom `RestrictedBlocksField` component.
4. Update `Users` collection access to reflect the final role matrix.

