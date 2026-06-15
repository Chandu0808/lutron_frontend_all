import {
  isWidgetVisibleInMap,
  normalizeDashboardWidgetKey,
  resolveWidgetConfigurationDisplayName,
} from '../../utils/dashboardWidgetVisibilityCore';

export const ENERGY_WIDGET_TITLE_DEFAULTS = {
  consumption: 'Consumption',
  savings: 'Savings',
  savingsByStrategy: 'Savings By Strategy',
  totalConsumptionByGroup: 'Consumption By Area Groups',
  consumptionSaving: 'Energy',
  lightPowerDensity: 'Lighting Power Density',
  peakAndMinimumConsumption: 'Peak & Minimum Consumption',
};

export const TOTAL_CONSUMPTION_GROUP_ALIASES = [
  'total_consumption_by_group',
  'consumption_by_area_groups',
];

/**
 * Legacy Dashboard getWidgetTitle — exact key match (basic/advanced) or
 * customized string coercion with dropdown_name fallback.
 */
export function resolveDashboardWidgetTitle(
  widgetKey,
  fallbackTitle,
  widgetList,
  options = {}
) {
  const { variant = 'basic' } = options;
  const titles = widgetList?.titles;
  if (!Array.isArray(titles)) return fallbackTitle;

  const widget = titles.find((entry) => {
    if (!entry) return false;
    if (variant === 'customized') {
      return String(entry.key) === String(widgetKey);
    }
    return entry.key === widgetKey;
  });

  if (!widget) return fallbackTitle;

  if (variant === 'customized') {
    return widget.title ?? widget.dropdown_name ?? fallbackTitle;
  }

  return widget.title || fallbackTitle;
}

export function resolveDashboardWidgetTitleWithAliases(
  primaryKey,
  aliasKeys,
  fallbackTitle,
  widgetList,
  options = {}
) {
  const keys = [primaryKey, ...(Array.isArray(aliasKeys) ? aliasKeys : [])];
  for (const key of keys) {
    const title = resolveDashboardWidgetTitle(key, '', widgetList, options);
    if (title) return title;
  }
  return fallbackTitle;
}

export function resolveEnergyWidgetTitles(widgetList, options = {}) {
  const { variant = 'basic', includeAliases = variant === 'customized' } = options;

  const resolve = (key, fallback, aliasKeys = []) => {
    if (includeAliases && aliasKeys.length > 0) {
      return resolveDashboardWidgetTitleWithAliases(key, aliasKeys, fallback, widgetList, {
        variant,
      });
    }
    return resolveDashboardWidgetTitle(key, fallback, widgetList, { variant });
  };

  return {
    consumption: resolve('consumption', ENERGY_WIDGET_TITLE_DEFAULTS.consumption),
    savings: resolve('savings', ENERGY_WIDGET_TITLE_DEFAULTS.savings),
    savingsByStrategy: resolve(
      'savings_by_strategy',
      ENERGY_WIDGET_TITLE_DEFAULTS.savingsByStrategy
    ),
    totalConsumptionByGroup: resolve(
      'total_consumption_by_group',
      ENERGY_WIDGET_TITLE_DEFAULTS.totalConsumptionByGroup,
      TOTAL_CONSUMPTION_GROUP_ALIASES
    ),
    consumptionSaving: resolve(
      'consumption_saving',
      ENERGY_WIDGET_TITLE_DEFAULTS.consumptionSaving
    ),
    lightPowerDensity: resolve(
      'light_power_density',
      ENERGY_WIDGET_TITLE_DEFAULTS.lightPowerDensity
    ),
    peakAndMinimumConsumption: resolve(
      'peak_and_minimum_consumption',
      ENERGY_WIDGET_TITLE_DEFAULTS.peakAndMinimumConsumption
    ),
  };
}

export function resolveEnergyWidgetVisibilityKeys(widgetKey) {
  if (widgetKey === 'total_consumption_by_group') {
    return TOTAL_CONSUMPTION_GROUP_ALIASES;
  }
  return [widgetKey];
}

export function resolveBuiltinEnergyWidgetVisible(widgetKey, visibilityMap, options = {}) {
  const { variant = 'basic' } = options;
  if (variant === 'advanced') return true;
  const canonical = normalizeDashboardWidgetKey(widgetKey);
  return isWidgetVisibleInMap(visibilityMap || {}, canonical);
}

/**
 * Customized grouped localStorage visibility (legacy shouldShowEnergyWidget).
 */
export function resolveCustomizedEnergyWidgetVisible(
  widgetKey,
  widgetVisibility,
  getEffectiveBuiltinDashboardPage
) {
  const keysToCheckPage = resolveEnergyWidgetVisibilityKeys(widgetKey);
  if (
    keysToCheckPage.some((key) => getEffectiveBuiltinDashboardPage(key) === 'space')
  ) {
    return false;
  }

  const energyMap = widgetVisibility?.energy;
  const spaceMap = widgetVisibility?.space;
  const hasEnergyMap =
    energyMap && typeof energyMap === 'object' && Object.keys(energyMap).length > 0;
  const hasSpaceMap =
    spaceMap && typeof spaceMap === 'object' && Object.keys(spaceMap).length > 0;

  if (!hasEnergyMap) {
    if (!hasSpaceMap) return true;
    return false;
  }

  if (String(widgetKey).startsWith('custom_graph:')) {
    return energyMap?.[widgetKey] !== false;
  }

  const keysToCheck = resolveEnergyWidgetVisibilityKeys(widgetKey);
  return keysToCheck.some((key) => energyMap?.[key] !== false);
}

export function resolveEnergyWidgetVisible(widgetKey, context = {}) {
  const { variant = 'basic', visibilityMap, widgetVisibility, getEffectiveBuiltinDashboardPage } =
    context;

  if (variant === 'customized') {
    return resolveCustomizedEnergyWidgetVisible(
      widgetKey,
      widgetVisibility,
      getEffectiveBuiltinDashboardPage || (() => 'energy')
    );
  }

  return resolveBuiltinEnergyWidgetVisible(widgetKey, visibilityMap, { variant });
}

export function resolveDashboardWidgetDisplayName(widgetKey, widgetList, fallbackTitle) {
  return resolveWidgetConfigurationDisplayName(widgetKey, widgetList) || fallbackTitle;
}
