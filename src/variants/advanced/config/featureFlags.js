// Feature flags - toggle these between `true` and `false` to enable/disable features.
//
// SHOW_OVERVIEW_TAB
//   true  -> Overview tab is visible in the dashboard tab strip and accessible at
//            /dashboard/overview. Default landing page is /dashboard/overview.
//   false -> Overview tab is hidden from the dashboard tab strip. Visiting
//            /dashboard or /dashboard/overview redirects to /dashboard/energy.
//            (No code is removed - just flip this back to `true` whenever you
//             want Overview back, no other changes required.)
export const SHOW_OVERVIEW_TAB = false;
