# Phase 6.5C.1 — Unified Email Export Gate Report

**Date:** 2026-06-10  
**Baseline:** Phase 6.5B complete (70 suites / 690 tests)  
**Status:** COMPLETE — build PASS, shared/dashboard tests PASS

---

## 1. Audit Results

### Dashboard export email entry points

| Location | Validation sequence (before) | Email source | Failure snackbars | Success path |
|---|---|---|---|---|
| `useDashboardExports` → `useBuiltInWidgetExportHandlers.handleEmail` | Profile email only (`userProfile?.email`) | Redux `state.user.profile.email` (untrimmed) | `User email not found. Please log in again.` | `runEnergyEmailExport` with `toEmail: userProfile.email` |
| `useDashboardExports` → `handleEnergyCustomGraphExport` | **None** (uses trimmed profile email inline) | `userProfile?.email?.trim()` | Export-level catch only | `runCustomGraphEnergyExport` — **NOT touched** |

### SpaceUtilization export email entry points

| Location | Validation sequence (before) | Email source | Failure snackbars | Success path |
|---|---|---|---|---|
| Variant `SpaceUtilization.jsx` → `useEmailExportGate` → `openEmailDialog` prop | Server config fetch → field validation → profile email | `userProfile.email.trim()` | `Email Server settings not configured` / `No email address found for logged-in user...` | Callback `action(email)` |
| `useSpaceExports.handleExport('email')` | Delegated to `openEmailDialog` | Via gate callback | Same as gate | `runSpaceEmailExport` |
| Customized custom graph export (`handleCustomSpaceExport` ~L1091) | Inline server + profile validation | `userProfile?.email?.trim()` | Same messages as gate | Direct thunk dispatch — **NOT touched** |

### Classification matrix

| Flow | Overlap with gate | Classification |
|---|---|---|
| Dashboard built-in energy email | Server check missing; profile-only | **NEAR** → standardized to **EXACT** |
| Space standard chart email | Full server + profile gate | **EXACT** |
| Dashboard custom graph email | Separate inline path | **VARIANT-ONLY** (stop boundary) |
| Space customized custom graph email | Separate inline path | **VARIANT-ONLY** (stop boundary) |
| Alerts / ActivityReport email | Same server+profile pattern | **EXACT** (out of 6.5C.1 scope — not Dashboard/Space export hooks) |

### Abort check

No custom graph export flow is coupled into the standard `useDashboardExports` / `useSpaceExports` email path. Custom graph handlers retain their own validation. **Proceed.**

---

## 2. Overlap Matrix

| Concern | Dashboard (before) | Space (before) | Unified gate |
|---|---|---|---|
| Server config fetch | No | Yes (`fetchEmailConfigs`) | Yes |
| Server field validation | No | Yes | Yes |
| Profile email resolution | Inline truthy check | Trim + empty check | `resolveLoggedInUserEmail` (trim) |
| Failure contract | Early return | Early return / no callback | `{ ok: false }` + snackbar |
| Success contract | Proceed to thunk | Callback with email | `{ ok: true, email }` |
| Snackbar on server failure | N/A | `Email Server settings not configured` | Same (standardized) |
| Snackbar on profile failure | `User email not found...` | `No email address found...` | `No email address found...` (standardized) |

---

## 3. Shared Module Design

```
src/shared/dashboard/export/
├── emailExportGate.js      # validateEmailExport, resolveLoggedInUserEmail, isEmailServerConfigValid
├── useEmailExportGate.js   # callback wrapper for legacy openEmailExportDialog consumers
├── emailExportGate.test.js # unit + dashboard/space integration tests
└── index.js                # public exports

src/shared/dashboard/export/email/   # backward-compat re-export shim (Alerts can migrate later)
```

### API

```javascript
const result = await validateEmailExport({
  dispatch,
  fetchEmailConfigs,
  userProfile,
  showSnackbar,
});
// { ok: true, email: 'user@example.com' } | { ok: false }
```

- No Redux/API contract changes
- No new network requests (reuses existing `fetchEmailConfigs` thunk)
- `useEmailExportGate` preserved for non-export consumers via shim

---

## 4. Files Created

| File | Purpose |
|---|---|
| `src/shared/dashboard/export/emailExportGate.js` | Core validation gate (83 LOC) |
| `src/shared/dashboard/export/useEmailExportGate.js` | Hook wrapper (16 LOC) |
| `src/shared/dashboard/export/emailExportGate.test.js` | 10 tests (282 LOC) |
| `src/shared/dashboard/export/index.js` | Barrel exports (9 LOC) |

---

## 5. Files Modified

| File | Change |
|---|---|
| `src/shared/dashboard/container/hooks/useDashboardExports.js` | `handleEmail` uses `validateEmailExport`; accepts `fetchEmailConfigs` |
| `src/shared/dashboard/space/export/useSpaceExports.js` | Inlined gate; removed `openEmailDialog` prop |
| `src/shared/dashboard/container/dashboardContainerAdapterHelpers.js` | Passes `fetchEmailConfigs` to exports hook |
| `src/shared/dashboard/space/container/spaceContainerAdapterHelpers.js` | Passes `userProfile` + `fetchEmailConfigs`; removed `openEmailDialog` |
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Passes `fetchEmailConfigs` to container runtime |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same |
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Removed variant gate; passes profile + fetch to container |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Same |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Same |
| `src/shared/dashboard/export/email/index.js` | Re-export shim to parent module |
| `src/shared/dashboard/export/email/emailExportResolvers.js` | Re-export shim |
| `src/shared/dashboard/export/email/useEmailExportGate.js` | Re-export shim |
| `src/shared/dashboard/space/container/spaceContainerAdapterHelpers.test.js` | Updated export options fixture |
| `src/shared/dashboard/space/container/spaceContainerParity.test.jsx` | Updated export options fixture |

### Files removed

| File | Reason |
|---|---|
| `src/shared/dashboard/export/email/emailExportResolvers.test.js` | Superseded by `emailExportGate.test.js` |

---

## 6. LOC Before / After (this phase only)

| Area | Before (approx.) | After (approx.) | Delta |
|---|---|---|---|
| Variant SpaceUtilization gate blocks (×3) | ~45 LOC | 0 | −45 |
| `useSpaceExports` email branch | ~25 LOC | ~22 LOC | −3 |
| `useDashboardExports` email check | ~4 LOC | ~10 LOC | +6 |
| New gate module (excl. tests) | 0 | ~108 LOC | +108 |
| New tests | 0 | ~282 LOC | +282 |
| Adapter / Dashboard runtime wiring | 0 | ~18 LOC | +18 |
| **Net production LOC** | | | **~+84** (centralized validation) |
| **Net incl. tests** | | | **~+366** |

Duplicated validation logic removed from 3 SpaceUtilization variants; single source of truth in export hooks.

---

## 7. Tests Added

`emailExportGate.test.js` — 10 tests:

1. Valid email → `{ ok: true, email }`
2. Missing email (empty profile object)
3. Missing profile (`null`)
4. Snackbar on server-not-configured failure
5. `openEmailExportDialog` success invokes action
6. Dashboard integration — gate passes, energy email thunk called
7. Dashboard integration — gate blocks on server failure
8. Space integration — gate passes, space email thunk + success snackbar
9. Space integration — gate blocks on missing profile
10. `isEmailServerConfigValid` field requirements

---

## 8. Build Result

```
npm run build
Compiled successfully.
```

---

## 9. Test Result

```
npm test -- --testPathPattern=shared/dashboard
Test Suites: 74 passed, 74 total
Tests:       708 passed, 708 total
```

(+4 suites / +18 tests vs 6.5B baseline from gate test file and prior 6.5C helper tests)

---

## 10. Stop-Boundary Verification

| Boundary | Status |
|---|---|
| Custom graph export pipeline | NOT touched (Dashboard `handleEnergyCustomGraphExport`, customized SU `handleCustomSpaceExport`) |
| Energy export dropdown JSX | NOT touched |
| Export thunk routing | NOT touched (`runEnergyEmailExport`, `runSpaceEmailExport`, action maps) |
| SpaceLayoutRenderer / SpaceWidgetRenderer | NOT touched |
| DashboardContainer / SpaceUtilizationContainer | NOT touched |
| DnD / fullscreen / area tree / chart adapters | NOT touched |
| Redux contracts | NOT touched |
| `handleEmailDialogOpen` in Alerts/ActivityReport | Remains inline (out of scope) |

### Mandatory audits

```
rg "handleEmailDialogOpen" src/
→ Alerts.jsx + ActivityReport.jsx only (6 files, out of scope)

rg "useDashboardExports" src/
→ container hooks + integration test only

rg "useSpaceExports" src/
→ space export hook + container only

rg "ExportDropdown" / "ChartExportDropdown" src/
→ unchanged presentation layer references only
```

---

## 11. Rollback Plan

1. Revert commits touching `emailExportGate.js`, `useDashboardExports.js`, `useSpaceExports.js`, adapter helpers, and 6 variant screen files.
2. Restore `useEmailExportGate` usage in SpaceUtilization variants with `openEmailDialog` prop.
3. Restore inline profile-only check in `useDashboardExports`.
4. Delete `src/shared/dashboard/export/emailExportGate.*` and `index.js` if added.
5. Re-run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

Single-commit revert is safe — no schema, API, or Redux changes.

---

## Behavioral Note

Dashboard built-in energy email exports now require valid email server configuration (matching Space). Snackbar wording is unified to the Space/Alerts messages. Export routing, payloads, success messages, and loading behavior are unchanged.
