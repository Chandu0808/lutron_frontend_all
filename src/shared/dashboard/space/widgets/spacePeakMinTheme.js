export const SPACE_PEAK_MIN_THEME_PRESETS = {
  basic: 'basic',
  advanced: 'advanced',
  customized: 'customized',
};

const ADVANCED_PANEL_BG = 'var(--dashboard-chart-loading-bg, #232323)';

export function resolveSpacePeakMinLoading({
  instantOccupancyCountLoading = false,
  anyLoading = false,
  isLoading = false,
  globalLoadingProp = false,
  includeInstantLoading = true,
}) {
  if (includeInstantLoading && instantOccupancyCountLoading) return true;
  if (anyLoading) return true;
  if (isLoading) return true;
  if (globalLoadingProp) return true;
  return false;
}

export function resolveSpacePeakMinTheme({
  preset = SPACE_PEAK_MIN_THEME_PRESETS.basic,
  chartSurface = 'dark',
  metricPanelBorder = null,
} = {}) {
  if (preset === SPACE_PEAK_MIN_THEME_PRESETS.basic) {
    return {
      preset,
      panelBg: '#1565C0',
      panelBorder: null,
      panelLayout: 'basic-stretch',
      rowGap: '12px',
      rowHeight: null,
      timeColor: chartSurface === 'light' ? 'rgba(255,255,255,0.85)' : '#ccc',
      loaderSpinnerStyle: {
        width: '20px',
        height: '20px',
        border: chartSurface === 'light' ? '2px solid rgba(255,255,255,0.35)' : '2px solid #555',
        borderTop: '2px solid #fff',
      },
      panelPadding: '14px 16px',
      loadingMinHeight: null,
    };
  }

  if (preset === SPACE_PEAK_MIN_THEME_PRESETS.advanced) {
    return {
      preset,
      panelBg: ADVANCED_PANEL_BG,
      panelBorder: metricPanelBorder || null,
      panelLayout: 'centered',
      rowGap: null,
      rowHeight: null,
      timeColor: '#ccc',
      loaderSpinnerStyle: {
        width: '20px',
        height: '20px',
        border: '2px solid #555',
        borderTop: '2px solid #fff',
      },
      panelPadding: '16px 14px',
      loadingMinHeight: '120px',
    };
  }

  if (preset === SPACE_PEAK_MIN_THEME_PRESETS.customized) {
    return {
      preset,
      panelBg: '#232323',
      panelBorder: null,
      panelLayout: 'centered',
      rowGap: '15px',
      rowHeight: null,
      timeColor: '#ccc',
      loaderSpinnerStyle: {
        width: '20px',
        height: '20px',
        border: '2px solid #555',
        borderTop: '2px solid #fff',
      },
      panelPadding: '16px 14px',
      loadingMinHeight: null,
    };
  }

  return resolveSpacePeakMinTheme({
    preset: SPACE_PEAK_MIN_THEME_PRESETS.basic,
    chartSurface,
  });
}
