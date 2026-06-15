# Phase 6.5F — Alerts / ActivityReport Email Gate Parity Report

**Date:** 2026-06-10  
**Baseline:** Phase 6.5E complete (78 suites / 760 tests after 6.5F)  
**Status:** COMPLETE — build PASS, shared/dashboard tests PASS

---

## 1. Audit Findings

### Inline validation (pre-migration)

All six variant files (`Alerts.jsx` ×3, `ActivityReport.jsx` ×3) contained identical `handleEmailDialogOpen` logic:

1. `dispatch(fetchEmailConfigs()).unwrap()`
2. Validate array non-empty + `server_name`, `port`, `server_email`, `sender_name`
3. On failure → `showSnackbar('Email Server settings not configured', 'error')`
4. Resolve `userProfile.email.trim()`
5. On missing email → `showSnackbar('No email address found for logged-in user. Please check your profile.', 'error')`
6. On success → `action(trimmedEmail)`

Export payload construction (`sendAlertsByEmail`, `sendActivityReportEmail`) runs only inside the `emailAction` callback after validation — **not coupled** to validation blocks.

### Overlap matrix

| Concern | Alerts | ActivityReport | Shared gate |
|---|---|---|---|
| Server config fetch | `fetchEmailConfigs` thunk | Same | `validateEmailExport` |
| Server field validation | Inline field checks | Same | `isEmailServerConfigValid` |
| Server failure snackbar | `Email Server settings not configured` | Same | `EMAIL_SERVER_NOT_CONFIGURED_MESSAGE` |
| Profile email source | `userProfile.email.trim()` | Same | `resolveLoggedInUserEmail` |
| Profile failure snackbar | `No email address found...` | Same | `EMAIL_PROFILE_MISSING_MESSAGE` |
| Success path | `action(email)` callback | Same | `result.email` via `invokeValidatedEmailExportAction` |
| Export thunk / payload | `sendAlertsByEmail(email)` | `sendActivityReportEmail({ toEmail, ...params })` | **Not in gate** (VARIANT-ONLY downstream) |
| Success snackbar | Alerts-specific messages | ActivityReport-specific messages | **Not in gate** (unchanged) |

### Classification

| Block | Classification |
|---|---|
| Server + profile validation | **EXACT** (migrated) |
| `handleEmailDialogOpen` callback pattern | **EXACT** |
| Export thunk + payload + success handling | **VARIANT-ONLY** (left in screen files) |
| Custom graph SU inline validation (~L1086) | **VARIANT-ONLY** (stop boundary — not touched) |

### Abort check

Validation is separate from payload construction. No custom graph code path in Alerts/ActivityReport. **Proceed.**

---

## 2. Files Modified

| File | Change |
|---|---|
| `src/shared/dashboard/export/emailExportGate.js` | Added `invokeValidatedEmailExportAction`; refactored `openEmailExportDialog` to use it |
| `src/shared/dashboard/export/index.js` | Export new helper |
| `src/variants/basic/screens/dashboard/Alerts.jsx` | Gate migration |
| `src/variants/advanced/screens/dashboard/Alerts.jsx` | Gate migration |
| `src/variants/customized/screens/dashboard/Alerts.jsx` | Gate migration |
| `src/variants/basic/screens/activityReport/ActivityReport.jsx` | Gate migration |
| `src/variants/advanced/screens/activityReport/ActivityReport.jsx` | Gate migration |
| `src/variants/customized/screens/activityReport/ActivityReport.jsx` | Gate migration |

**Created:** `src/shared/dashboard/export/emailGateParity.test.js`

---

## 3. Tests Added

`emailGateParity.test.js` — 8 tests:

**Alerts**
1. Success path invokes action with validated email
2. Missing profile → shared snackbar, no action
3. Server config failure → shared snackbar, no action
4. Mirrors `handleEmailDialogOpen` + `emailAction` contract

**ActivityReport**
5. Success path invokes action with validated email
6. Missing profile → shared snackbar, no action
7. Server config failure → shared snackbar, no action
8. Mirrors `handleEmailDialogOpen` + `emailAction` contract

---

## 4. LOC Delta

| Area | Approx. delta |
|---|---|
| Removed inline validation (6 files × ~33 LOC) | −198 |
| Added `invokeValidatedEmailExportAction` + wiring (6 files × ~9 LOC) | +74 |
| New parity tests | +148 |
| **Net production LOC** | **~−124** |
| **Net incl. tests** | **+24** |

---

## 5. Verification Results

```
npm run build
Compiled successfully.

npm test -- --testPathPattern=shared/dashboard
Test Suites: 78 passed, 78 total
Tests:       760 passed, 760 total
```

(+1 suite / +8 tests vs 6.5E baseline)

Remaining inline `Email Server settings not configured` strings: only customized `SpaceUtilization.jsx` custom graph export (intentional stop boundary).

---

## 6. Rollback Plan

1. Revert commits touching `emailExportGate.js`, six variant screen files, and `emailGateParity.test.js`.
2. Restore inline `handleEmailDialogOpen` validation blocks from git history.
3. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

Safe single-commit revert — no Redux/API/export payload changes.

---

## 7. Stop-Boundary Compliance

| Boundary | Status |
|---|---|
| `DashboardContainer` / `SpaceUtilizationContainer` | NOT touched |
| Widget / layout renderers | NOT touched |
| Export routing / thunks / payloads | NOT touched |
| Success snackbars / loading behavior | NOT touched |
| Custom graph exports (SU ~L1086) | NOT touched |
| Redux / API contracts | NOT touched |
| DnD / fullscreen / chart adapters | NOT touched |

---

## Summary

Alerts and ActivityReport (all three variants) now use `invokeValidatedEmailExportAction` from the shared email gate introduced in Phase 6.5C.1. Validation behavior and snackbar messages are unchanged; export thunks, payloads, and success handling remain in each screen's `emailAction` callback.
