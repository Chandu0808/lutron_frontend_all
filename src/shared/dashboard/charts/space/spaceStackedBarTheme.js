export const SPACE_STACKED_BAR_THEME_PRESETS = {
  basic: 'basic',
  advanced: 'advanced',
  customized: 'customized',
};

const DEFAULT_BAR_PAIR = {
  unoccupied: '#FFB3B3',
  occupied: '#98FB98',
};

/**
 * Resolve theme tokens for space stacked bar chart.
 */
export function resolveSpaceStackedBarTheme({
  preset = SPACE_STACKED_BAR_THEME_PRESETS.basic,
  spaceShell = null,
  stackedBarColors = null,
  cardBackground = null,
  cardBorder = null,
  cardShadow = null,
  showChartsTab = false,
} = {}) {
  if (preset === SPACE_STACKED_BAR_THEME_PRESETS.basic && spaceShell) {
    return {
      preset,
      plotHeightStyle: showChartsTab ? 'chartsTabClamp' : 'fixed400',
      plotBg: spaceShell.plotBg,
      plotBorder: spaceShell.plotBorder,
      grid: spaceShell.grid,
      axis: spaceShell.axis,
      tick: spaceShell.tick,
      yLabel: spaceShell.yLabel,
      tooltipBg: spaceShell.tooltipBg,
      tooltipText: spaceShell.tooltipText,
      tooltipBorder: spaceShell.tooltipBorder,
      tooltipHeadBorder: spaceShell.tooltipHeadBorder,
      barEdge: spaceShell.barEdge,
      barColors: DEFAULT_BAR_PAIR,
      emptyBg: spaceShell.emptyBg,
      emptyColor: spaceShell.emptyColor,
      spinOuter: spaceShell.spinOuter,
      spinTop: spaceShell.spinTop,
      shellStyle: {},
    };
  }

  if (preset === SPACE_STACKED_BAR_THEME_PRESETS.advanced) {
    const pair = stackedBarColors || DEFAULT_BAR_PAIR;
    return {
      preset,
      plotHeightStyle: 'fixed400',
      plotBg: null,
      plotBorder: '1px solid #ddd',
      grid: '#fff',
      axis: '#fff',
      tick: '#fff',
      yLabel: '#fff',
      tooltipBg: cardBackground,
      tooltipText: '#fff',
      tooltipBorder: '1px solid #fff',
      tooltipHeadBorder: '#fff',
      barEdge: '#fff',
      barColors: pair,
      emptyBg: cardBackground,
      emptyColor: '#fff',
      spinOuter: '#555',
      spinTop: '#fff',
      shellStyle: {
        background: cardBackground,
        border: cardBorder,
        boxShadow: cardShadow,
      },
    };
  }

  if (preset === SPACE_STACKED_BAR_THEME_PRESETS.customized) {
    return {
      preset,
      plotHeightStyle: 'flexFill',
      plotBg: '#767061',
      plotBorder: '1px solid #ddd',
      grid: '#fff',
      axis: '#fff',
      tick: '#fff',
      yLabel: '#fff',
      tooltipBg: '#807864',
      tooltipText: '#fff',
      tooltipBorder: '1px solid #fff',
      tooltipHeadBorder: '#fff',
      barEdge: '#fff',
      barColors: DEFAULT_BAR_PAIR,
      emptyBg: '#767061',
      emptyColor: '#fff',
      spinOuter: '#555',
      spinTop: '#fff',
      shellStyle: {},
    };
  }

  return resolveSpaceStackedBarTheme({
    preset: SPACE_STACKED_BAR_THEME_PRESETS.basic,
    spaceShell,
    showChartsTab,
  });
}
