import {
  useDashboardExports,
  useDashboardDates,
  useDashboardWidgets,
  useDashboardVisibility,
} from './hooks';

export function useDashboardContainer(adapter, runtime) {
  const visibility = useDashboardVisibility(adapter.resolveVisibilityOptions(runtime));

  const widgets = useDashboardWidgets(
    adapter.resolveWidgetsOptions({
      ...runtime,
      visibility,
    })
  );

  const dates = useDashboardDates(
    adapter.resolveDatesOptions({
      ...runtime,
      widgets,
      setChartLoading: widgets.setChartLoading,
      setAllEnergyChartsReady: widgets.setAllEnergyChartsReady,
    })
  );

  const exports = useDashboardExports(
    adapter.resolveExportsOptions({
      ...runtime,
      dates,
      calculateDateParameters: dates.calculateDateParameters,
    })
  );

  return {
    visibility,
    widgets,
    dates,
    exports,
  };
}
