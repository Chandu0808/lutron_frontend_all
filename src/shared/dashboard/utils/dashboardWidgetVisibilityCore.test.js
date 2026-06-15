/**
 * @jest-environment node
 */
import {
  applyVisibilityToggleToMap,
  getDefaultDashboardWidgetVisibilityMap,
  hasBackendWidgetConfiguration,
  isWidgetVisibleInMap,
  normalizeDashboardWidgetKey,
  widgetConfigurationItemsToVisibilityMap,
} from './dashboardWidgetVisibilityCore';

describe('dashboardWidgetVisibilityCore (shared)', () => {
  it('normalizes alias keys', () => {
    expect(normalizeDashboardWidgetKey('consumption_by_area_groups')).toBe(
      'total_consumption_by_group'
    );
  });

  it('converts backend items to sparse hidden map', () => {
    const map = widgetConfigurationItemsToVisibilityMap([
      { widget_key: 'consumption', is_visible: false },
      { widget_key: 'savings', is_visible: true },
    ]);
    expect(map).toEqual({ consumption: false });
    expect(isWidgetVisibleInMap(map, 'savings')).toBe(true);
  });

  it('hasBackendWidgetConfiguration detects items', () => {
    expect(hasBackendWidgetConfiguration([])).toBe(false);
    expect(hasBackendWidgetConfiguration([{ widget_key: 'x', is_visible: true }])).toBe(true);
  });

  it('applyVisibilityToggleToMap removes key when visible', () => {
    const next = applyVisibilityToggleToMap({ consumption: false }, 'consumption', true);
    expect(next.consumption).toBeUndefined();
  });

  it('default map hides non-default keys', () => {
    const m = getDefaultDashboardWidgetVisibilityMap();
    expect(m.consumption).toBe(false);
    expect(m.energy).toBeUndefined();
  });
});
