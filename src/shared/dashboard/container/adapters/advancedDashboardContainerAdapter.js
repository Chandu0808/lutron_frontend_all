import { ADVANCED_DASHBOARD_LAYOUT_ADAPTER } from '../layout/adapters/advancedDashboardLayoutAdapter';
import {
  buildAdvancedDashboardExportOptions,
  buildAdvancedDashboardSections,
  buildAdvancedDashboardVisibilityOptions,
  buildDashboardDatesOptions,
  buildDashboardWidgetOptions,
} from './dashboardAdapterHelpers';

export const advancedDashboardContainerAdapter = {
  variant: 'advanced',
  layoutAdapter: ADVANCED_DASHBOARD_LAYOUT_ADAPTER,

  resolveVisibilityOptions(runtime) {
    return buildAdvancedDashboardVisibilityOptions(runtime);
  },

  resolveWidgetsOptions(ctx) {
    return buildDashboardWidgetOptions(ctx, 'advanced');
  },

  resolveDatesOptions(ctx) {
    return buildDashboardDatesOptions(ctx);
  },

  resolveExportsOptions(ctx) {
    return buildAdvancedDashboardExportOptions(ctx);
  },

  buildSections({ orchestration, runtime }) {
    return buildAdvancedDashboardSections({ orchestration, runtime });
  },
};
