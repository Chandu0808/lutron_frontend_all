import { CUSTOMIZED_DASHBOARD_LAYOUT_ADAPTER } from '../layout/adapters/customizedDashboardLayoutAdapter';
import {
  buildCustomizedDashboardExportOptions,
  buildCustomizedDashboardSections,
  buildCustomizedDashboardVisibilityOptions,
  buildDashboardDatesOptions,
  buildDashboardWidgetOptions,
} from './dashboardAdapterHelpers';

export const customizedDashboardContainerAdapter = {
  variant: 'customized',
  layoutAdapter: CUSTOMIZED_DASHBOARD_LAYOUT_ADAPTER,

  resolveVisibilityOptions(runtime) {
    return buildCustomizedDashboardVisibilityOptions(runtime);
  },

  resolveWidgetsOptions(ctx) {
    return buildDashboardWidgetOptions(ctx, 'customized');
  },

  resolveDatesOptions(ctx) {
    return buildDashboardDatesOptions(ctx);
  },

  resolveExportsOptions(ctx) {
    return buildCustomizedDashboardExportOptions(ctx);
  },

  buildSections({ orchestration, runtime }) {
    return buildCustomizedDashboardSections({ orchestration, runtime });
  },
};
