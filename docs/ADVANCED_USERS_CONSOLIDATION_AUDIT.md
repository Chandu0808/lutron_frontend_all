# Advanced Users Consolidation Audit

**Date:** 2026-06-10  
**Scope:** Read-only comparison of advanced variant users screens vs shared users implementation  
**Files analyzed:**

| Role | Path |
|------|------|
| Advanced (full impl.) | `src/variants/advanced/screens/settings/Users/UsersComponent.jsx` |
| Advanced (full impl.) | `src/variants/advanced/screens/settings/Users/CreateUser.jsx` |
| Advanced (full impl.) | `src/variants/advanced/screens/settings/Users/UpdateUser.jsx` |
| Advanced (support) | `src/variants/advanced/screens/settings/Users/userSelectMenuProps.js` |
| Advanced (re-export) | `src/variants/advanced/screens/settings/Users/userUpdatePayload.js` |
| Shared (canonical) | `src/shared/settings/users/UsersComponent.jsx` |
| Shared (canonical) | `src/shared/settings/users/CreateUser.jsx` |
| Shared (canonical) | `src/shared/settings/users/UpdateUser.jsx` |
| Shared (support) | `src/shared/settings/users/userUpdatePayload.js` |
| Shared (bindings) | `src/shared/settings/users/bindUsersSettingsModule.js` |
| Basic wrapper | `src/variants/basic/screens/settings/Users/UsersComponent.jsx` (32 LOC) |
| Customized wrapper | `src/variants/customized/screens/settings/Users/UsersComponent.jsx` (37 LOC) |

**Note:** Advanced users screens are **not** thin Phase 5.2 wrappers. Basic and customized already delegate to shared via `bindUsersSettingsModule` + re-export.

---

## 1. Exact LOC Difference

| File | Advanced | Shared | Δ (shared − advanced) |
|------|----------|--------|------------------------|
| `UsersComponent.jsx` | 488 | 583 | **+95** |
| `CreateUser.jsx` | 508 | 546 | **+38** |
| `UpdateUser.jsx` | 549 | 564 | **+15** |
| **Three-screen total** | **1,545** | **1,693** | **+148** |

| Supporting file | Advanced | Shared | Notes |
|-----------------|----------|--------|-------|
| `userSelectMenuProps.js` | 104 | — | Advanced-only presentation tokens |
| `userUpdatePayload.js` | 3 (re-export) | 88 | Shared owns payload helpers; advanced re-exports |
| `bindUsersSettingsModule.js` | — | 12 | Shared binding registry |
| Variant wrapper | — | 32–37 | Basic/customized only |

**Net duplication today:** Advanced maintains **~1,545 LOC** of screen logic that largely mirrors shared, plus **104 LOC** of presentation helpers not yet in shared.

**Hash comparison:** All three screen pairs differ (`sha256` prefix mismatch on every pair). Files are structurally similar but not byte-identical.

---

## 2. Behavioral Differences

| # | Area | Advanced | Shared | Classification | Same behavior? |
|---|------|----------|--------|----------------|----------------|
| B1 | Mount fetch | `localStorage.getItem("lutron")` → `dispatch(fetchUsers())` | Identical | business logic | ✅ Yes |
| B2 | Modal refresh | `wasAnyModalOpenRef` refetch on modal close | Identical | business logic | ✅ Yes |
| B3 | Search filter | Client-side name/email filter on `displayUsers` | Identical | business logic | ✅ Yes |
| B4 | Unauthorized redirect | Operators without floors → `/manage-area-groups` | Identical | business logic | ✅ Yes |
| B5 | Loading gate | Wait for `role` + `userProfile !== undefined` before render | Identical | business logic | ✅ Yes |
| B6 | Create dialog guard | Close if `availableRoles.length === 0` | Identical | permissions | ✅ Yes |
| B7 | Create payload | `{ name, email, password, role, floor[] }` via `permissionMap` | Identical shape | API contract | ✅ Yes |
| B8 | Update patch | `buildUserPatchBody` / `hasUserUpdateChanges` from `userUpdatePayload` | Identical (advanced imports shared module) | API contract | ✅ Yes |
| B9 | Delete flow | `ConfirmDialog` → `deleteUser(id)` → `clearDeleteError` | Identical | API contract | ✅ Yes |
| B10 | Delete button visibility | Nested under `canDeleteUsers()` inside `canUpdateUsers()` | Delete shown whenever `canUpdateUsers()` (no inner gate) | permissions | ✅ Yes* |
| B11 | API error display | `apiError` suppressed (`null`) | Identical | presentation only | ✅ Yes |
| B12 | `clearUpdateError` on open/close | Imported from `usersSlice`, dispatched | Called but **not bound** in `getUsersSettingsBindings()` destructuring | business logic | ❌ **Shared bug** |

\* `canDeleteUsers`, `canUpdateUsers`, and `canCreateUsers` all resolve to `role === 'Superadmin' || role === 'Admin'`, so B10 is structurally different but functionally equivalent today.

**Summary:** Business logic and API behavior are effectively **identical** except shared `UpdateUser` has a latent `clearUpdateError` reference error if exercised through bindings.

---

## 3. Layout Differences

| # | Area | Advanced | Shared | Classification |
|---|------|----------|--------|----------------|
| L1 | Page shell | `<SettingsLayout>` → `SharedSettingsShell` + `SettingsSidebarNav` + `advancedSettingsLayoutAdapter` | Inline `<Grid container>` with embedded sidebar column | **layout only** |
| L2 | Sidebar component | Delegated to `SettingsLayout` (themed, responsive) | Manual `visibleSidebarItemsWithPaths.map` loop with `navigate(item.path)` | **layout only** |
| L3 | Main content padding | Inherited from `SettingsLayout` / shell | `Grid item md={9} sx={{ p: 6 }}` | **layout only** |
| L4 | Toolbar responsiveness | `flexDirection: { xs: column, sm: row }`, `settings-page-toolbar` class | Single-row flex, fixed 300px search width | **layout only** |
| L5 | Table wrapper | `settings-responsive-table` class, full-width | Standard `TableContainer` inside grid column | **layout only** |
| L6 | Confirm dialog placement | Outside `SettingsLayout`, sibling in fragment | Inside main `Grid` column | **layout only** |
| L7 | Dead bindings in shared | N/A | `SettingsSidebarNav`, `settingsSidebarColumnDividerSx`, `SETTINGS_USERS_ACTION_QUERY` destructured but **unused** | layout only (tech debt) |

**Critical architectural note:** Shared `UsersComponent` was migrated from legacy `_source` (embedded sidebar). Advanced already uses the **Phase 5.2 settings shell pattern** (`SettingsLayout`). Basic binds `SettingsSidebarNav` but shared never uses it—basic production users page likely shows the legacy embedded sidebar, not the settings shell used elsewhere in basic.

---

## 4. RBAC Differences

| Function | Advanced | Shared | Classification |
|----------|----------|--------|----------------|
| `canViewUsers()` | Superadmin/Admin always; Operator if `userProfile.floors.length > 0` | Identical | permissions (no diff) |
| `canCreateUsers()` | Superadmin \| Admin | Identical | permissions (no diff) |
| `canDeleteUsers()` | Superadmin \| Admin | Identical | permissions (no diff) |
| `canUpdateUsers()` | Superadmin \| Admin | Identical | permissions (no diff) |
| Create button render | `(role === 'Superadmin' \|\| role === 'Admin')` | Identical inline check (not `canCreateUsers()`) | permissions (no diff) |
| `getAvailableRoles()` (CreateUser) | Superadmin → Admin/Operator; Admin → Operator; Operator → [] | Identical | permissions (no diff) |
| Operator floor edit (UpdateUser) | Only when `user.role === "Operator"` | Identical | permissions (no diff) |

**Summary:** **No RBAC behavioral differences.** Comment in shared `CreateUser` header incorrectly says Superadmin can create Superadmin; code does not allow that in either variant.

---

## 5. API Differences

| Layer | Advanced | Shared | Classification |
|-------|----------|--------|----------------|
| Redux thunks | Direct import from `variants/advanced/redux/.../usersSlice`, `createUserSlice`, `floorSlice` | Injected via `bindUsersSettingsModule` | API contract (wiring only) |
| `fetchUsers` | Same thunk shape | Same (variant-bound) | API contract (no diff) |
| `createUser` payload | Shared `permissionMap` / `permissionOptions` | Inline duplicate `permissionMap` in CreateUser (same values) | API contract (no diff) |
| `updateUser` body | `buildUserPatchBody` from shared `userUpdatePayload` | Same helpers | API contract (no diff) |
| `deleteUser` | `deleteUser(user.id)` | Identical | API contract (no diff) |
| Selectors | `selectUsers`, loading/error/delete selectors | Identical via bindings | API contract (no diff) |
| Auth token key | `localStorage "lutron"` | Identical | API contract (no diff) |
| Error strings | Same snackbar messages for duplicate name, permission denied, etc. | Identical | presentation only |

**Summary:** **No API contract differences.** Advanced already consumes shared `userUpdatePayload` for create/update permission mapping and patch construction.

---

## 6. Form Differences

| # | Field / UX | Advanced | Shared | Classification |
|---|------------|----------|--------|----------------|
| F1 | Modal backdrop | `BackdropProps: { backgroundColor: 'transparent' }` + inner `users-modal-shell` box | Opaque `theme.palette.custom.containerBg` on `PaperProps` | presentation only |
| F2 | Modal title colors | CSS vars (`--settings-panel-text`, `--settings-panel-muted-text`) | `theme.palette.text.primary/secondary` | presentation only |
| F3 | Create caption | Extra line: *"Sign in uses Name and Password (not email)."* | Subtitle only (no sign-in caption) | presentation only |
| F4 | TextField / Select styling | `usersFormFieldSx`, `usersReadonlyFieldSx` from `userSelectMenuProps.js` | Hardcoded `#fff` surfaces, inline `outlinedSelectLabelSx` | presentation only |
| F5 | Select menus | `premiumSelectMenuProps` (themed paper, max height) | `floorSelectMenuProps` / inline `MenuProps` with `maxHeight: 320` | presentation only |
| F6 | Save/Cancel buttons | `getThemeButtonColor(appTheme)` | `theme.palette.custom.buttonBg` or theme palette | presentation only |
| F7 | Operator floors UI | Checkbox multi-select + shared access level dropdown | Identical field structure | business logic (no diff) |
| F8 | Email validation | `validateEmail` + regex | Identical | business logic (no diff) |
| F9 | Readonly role field (Update) | `usersReadonlyFieldSx` + CSS vars | Hardcoded `#f0f0f0` background | presentation only |
| F10 | Mixed floor permissions | `MIXED_ACCESS_SENTINEL` handling | Identical logic in UpdateUser | business logic (no diff) |

**Summary:** Form **business rules are the same**; differences are almost entirely **presentation** (theme tokens, modal chrome, captions).

---

## 7. Difference Classification Summary

| Classification | Count | Examples |
|----------------|-------|----------|
| **presentation only** | 12 | CSS vars, `getThemeButtonColor`, premium modal shell, sign-in caption |
| **layout only** | 7 | `SettingsLayout` vs embedded sidebar, toolbar breakpoints, dialog placement |
| **business logic** | 1 | Shared `clearUpdateError` unbound (bug) |
| **API contract** | 0 effective | Wiring differs; payloads identical |
| **permissions** | 0 effective | RBAC functions identical; delete nesting cosmetic |

---

## 8. Can Advanced Convert to Shared + Advanced Adapter?

### Answer: **Yes — with preconditions**

Advanced users can be converted to:

```
shared UsersComponent / CreateUser / UpdateUser
+
advanced users adapter (bindings + presentation + layout shell)
```

**without changing observable behavior**, provided:

1. **Layout shell injection** — Shared `UsersComponent` must accept a `SettingsLayout` (or generic `UsersPageShell`) via bindings instead of hardcoding the embedded sidebar grid.
2. **Presentation adapter** — Move or bind `userSelectMenuProps.js`, `getThemeButtonColor`, and premium modal chrome as an `advancedUsersPresentationAdapter` consumed by shared forms.
3. **Fix shared `UpdateUser` bug** — Add `clearUpdateError` to bindings destructuring before advanced uses shared UpdateUser.
4. **Canonical source choice** — Re-base shared list screen on the **advanced layout pattern** (`SettingsLayout`), not legacy embedded sidebar, to avoid regressing advanced while fixing basic inconsistency.

### Proposed adapter shape (conceptual)

```javascript
// variants/advanced/screens/settings/Users/usersSettingsBindings.js
bindUsersSettingsModule({
  usersSlice, createUserSlice, floorSlice,
  ConfirmDialog, UseAuth, userlogin, themeSlice,
  SettingsSidebarNav,
  UsersPageShell: SettingsLayout,           // layout adapter
  usersPresentation: advancedUsersPresentationAdapter, // theme tokens, modal shell
  settingsUsersBreadcrumbParams,
  settingsSidebarTabStyles,
});

export { default } from 'shared/settings/users/UsersComponent';
```

Shared screens would read optional `usersPresentation` and `UsersPageShell` from bindings with sensible defaults for customized (embedded sidebar) and basic.

---

## 9. Effort and Risk Estimate

| Phase | Work | Effort | Risk |
|-------|------|--------|------|
| 1 | Fix `clearUpdateError` binding in shared UpdateUser | 0.25 day | Low |
| 2 | Extract `UsersPageShell` slot in shared UsersComponent; wire `SettingsLayout` for advanced/basic | 1–1.5 days | Medium |
| 3 | Extract presentation adapter (`userSelectMenuProps`, button colors, modal shell) for shared Create/Update | 1–1.5 days | Medium |
| 4 | Replace advanced 3 full files with thin wrappers (~35 LOC each) | 0.5 day | Low |
| 5 | Visual regression (all app themes on advanced), RBAC smoke (Superadmin/Admin/Operator) | 1–1.5 days | Medium |
| **Total** | | **3.5–5 days** | **Medium** |

### Risk factors

| Risk | Severity | Mitigation |
|------|----------|------------|
| Theme/CSS variable parity across 4+ app themes | Medium | Side-by-side screenshots per theme before/after |
| Basic users page layout change when shared drops embedded sidebar | Medium | Use `SettingsLayout` for basic in same adapter pass |
| Shared `UpdateUser` runtime error on edit open | High (if unfixed) | Fix binding before switching advanced |
| Customized embedded sidebar regression | Low–Medium | Keep `UsersPageShell` default = embedded grid path |
| Dead binding cleanup (`SETTINGS_USERS_ACTION_QUERY`) | Low | Optional; wire breadcrumb query or remove |

### Expected outcome

| Metric | Before | After (est.) |
|--------|--------|--------------|
| Advanced users LOC | ~1,649 (screens + helpers) | ~120 (3 wrappers + adapter) |
| Duplicate logic | 3 full screens | 0 |
| Behavioral parity | — | Preserved (with bugfix) |
| Basic layout consistency | Embedded sidebar on users page | Aligned with other settings pages |

---

## 10. Recommendations

1. **Proceed with consolidation** — Similarity is high (~95% logic parity); differences are adapter-friendly.
2. **Use advanced as the layout/presentation reference** when updating shared, not `_source` embedded sidebar.
3. **Fix `clearUpdateError` first** — Blocking defect in shared UpdateUser.
4. **Do not copy shared → advanced** — Shared list layout is the older pattern; advanced is ahead of shared for Phase 5.2 alignment.
5. **Consolidate `userSelectMenuProps` into** `src/shared/settings/users/adapters/advancedUsersPresentation.js` (or variant adapter folder) so basic/customized can opt in later.

---

## Appendix A: Import Topology

```
advanced UsersComponent
  ├── redux: usersSlice (direct)
  ├── SettingsLayout → SharedSettingsShell + advancedSettingsLayoutAdapter
  ├── getThemeButtonColor, usersFormFieldSx (variant-local)
  └── CreateUser / UpdateUser (variant-local, full impl.)

basic/customized UsersComponent
  ├── bindUsersSettingsModule({ ... variant deps })
  └── export shared UsersComponent

shared UsersComponent
  ├── getUsersSettingsBindings()
  ├── embedded sidebar (legacy)
  └── shared CreateUser / UpdateUser
```

## Appendix B: Files Safe to Delete After Consolidation

| File | LOC | Condition |
|------|-----|-----------|
| `variants/advanced/.../UsersComponent.jsx` | 488 | After wrapper + adapter |
| `variants/advanced/.../CreateUser.jsx` | 508 | After presentation adapter |
| `variants/advanced/.../UpdateUser.jsx` | 549 | After presentation adapter + bugfix |
| `variants/advanced/.../userUpdatePayload.js` | 3 | Already redundant re-export |

**Keep / relocate:** `userSelectMenuProps.js` → advanced presentation adapter module.

---

*Generated as part of Phase 5 consolidation analysis. No code was modified.*
