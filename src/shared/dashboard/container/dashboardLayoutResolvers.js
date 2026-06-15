import {
  isWidgetVisibleInMap,
  normalizeDashboardWidgetKey,
} from '../utils/dashboardWidgetVisibilityCore';

export const DASHBOARD_ORDER_STORAGE_KEY = 'dashboardOrder';
export const CUSTOMIZED_WIDGET_VISIBILITY_STORAGE_KEY = 'widgetVisibility';
export const ENERGY_CHART_ORDER_STORAGE_KEY = 'dashboard-energy-chart-slot-order-v1';

export const ENERGY_CHART_SLOT_ORDER_DEFAULT = [
  'consumption',
  'consumption_saving',
  'savings',
  'savings_by_strategy',
  'total_consumption_by_group',
  'light_power_density',
  'peak_and_minimum_consumption',
];

export const ENERGY_STANDALONE_CHART_ORDER = [
  'savings_by_strategy',
  'total_consumption_by_group',
  'consumption',
  'savings',
  'light_power_density',
  'peak_and_minimum_consumption',
];

export function createVisibilityChecker(visibilityMap) {
  return (widgetKey) => isWidgetVisibleInMap(visibilityMap, widgetKey);
}

export function normalizeEnergySlotOrder(
  parsed,
  slotOrderDefault = ENERGY_CHART_SLOT_ORDER_DEFAULT
) {
  if (!Array.isArray(parsed)) return [...slotOrderDefault];
  const known = new Set(slotOrderDefault);
  const next = parsed.filter((id) => known.has(id));
  for (const id of slotOrderDefault) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

export function deriveEnergyChartOrderFromWidgetTitles(
  widgetList,
  slotOrderDefault = ENERGY_CHART_SLOT_ORDER_DEFAULT
) {
  const titles = widgetList?.titles;
  if (!Array.isArray(titles) || titles.length === 0) return [...slotOrderDefault];
  const seen = new Set();
  const next = [];
  for (const entry of titles) {
    const key = normalizeDashboardWidgetKey(entry?.key);
    if (!slotOrderDefault.includes(key) || seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  for (const id of slotOrderDefault) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

export function isCanonicalDefaultEnergyOrder(
  merged,
  slotOrderDefault = ENERGY_CHART_SLOT_ORDER_DEFAULT
) {
  const def = normalizeEnergySlotOrder([...slotOrderDefault], slotOrderDefault);
  return JSON.stringify(merged) === JSON.stringify(def);
}

export function migrateEnergyChartOrderSessionToLocalOnce(
  storageKey = ENERGY_CHART_ORDER_STORAGE_KEY
) {
  try {
    const fromSession = sessionStorage.getItem(storageKey);
    if (!fromSession) return;
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, fromSession);
    }
  } catch {
    /* ignore */
  }
}

export function loadEnergyChartOrderFromStorage(
  storageKey = ENERGY_CHART_ORDER_STORAGE_KEY
) {
  migrateEnergyChartOrderSessionToLocalOnce(storageKey);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [...ENERGY_CHART_SLOT_ORDER_DEFAULT];
    return normalizeEnergySlotOrder(JSON.parse(raw));
  } catch {
    return [...ENERGY_CHART_SLOT_ORDER_DEFAULT];
  }
}

export function hasStoredEnergyChartOrder(storageKey = ENERGY_CHART_ORDER_STORAGE_KEY) {
  migrateEnergyChartOrderSessionToLocalOnce(storageKey);
  try {
    return Boolean(localStorage.getItem(storageKey));
  } catch {
    return false;
  }
}

export function clearDragTranslateKeys(keys) {
  if (!keys || !keys.length) return;
  for (const key of keys) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function applyEnergyStandaloneChartOrder(prev, visibilityMap) {
  const isVisible = createVisibilityChecker(visibilityMap);
  if (isVisible('consumption_saving')) {
    return prev;
  }
  const visibleStandalone = ENERGY_STANDALONE_CHART_ORDER.filter((id) => isVisible(id));
  const hidden = [
    ...new Set(prev.filter((id) => !isVisible(id) || id === 'consumption_saving')),
  ];
  const next = [
    ...visibleStandalone,
    ...hidden.filter((id) => !visibleStandalone.includes(id)),
  ];
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return prev;
  }
  return next;
}

export function applyEnergyCombinedChartOrder(prev, visibilityMap) {
  const isVisible = createVisibilityChecker(visibilityMap);
  if (!isVisible('consumption_saving')) {
    return prev;
  }
  const rest = ENERGY_STANDALONE_CHART_ORDER.filter((id) => isVisible(id));
  const visibleOrder = ['consumption_saving', ...rest];
  const hidden = [...new Set(prev.filter((id) => !isVisible(id)))];
  const next = [
    ...visibleOrder,
    ...hidden.filter((id) => !visibleOrder.includes(id)),
  ];
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return prev;
  }
  return next;
}

export function applyEnergyChartOrderForVisibility(prev, visibilityMap) {
  const isVisible = createVisibilityChecker(visibilityMap);
  return isVisible('consumption_saving')
    ? applyEnergyCombinedChartOrder(prev, visibilityMap)
    : applyEnergyStandaloneChartOrder(prev, visibilityMap);
}

export function resolveEnergyVisibleSlotOrder(visibilityMap) {
  const isVisible = createVisibilityChecker(visibilityMap);
  if (isVisible('consumption_saving')) {
    const rest = ENERGY_STANDALONE_CHART_ORDER.filter((id) => isVisible(id));
    return ['consumption_saving', ...rest];
  }
  return ENERGY_STANDALONE_CHART_ORDER.filter((id) => isVisible(id));
}

export function resolveHiddenEnergySlotIds(fullOrder, visibilityMap) {
  const isVisible = createVisibilityChecker(visibilityMap);
  return [...new Set(fullOrder.filter((id) => !isVisible(id)))];
}

export function resolveEnergyAllVisible(
  visibilityMap,
  slotOrderDefault = ENERGY_CHART_SLOT_ORDER_DEFAULT
) {
  const isVisible = createVisibilityChecker(visibilityMap);
  return slotOrderDefault.every((id) => isVisible(id));
}

export function resolveShowEnergyStandaloneDurationFilter(
  visibilityMap,
  energyVisibleSlotOrder
) {
  const isVisible = createVisibilityChecker(visibilityMap);
  return !isVisible('consumption_saving') && energyVisibleSlotOrder.length > 0;
}

export function buildEnergyDashboardRows(visibleIds) {
  const rows = [];
  let i = 0;
  while (i < visibleIds.length) {
    const id = visibleIds[i];
    if (id === 'consumption_saving') {
      rows.push([id]);
      i += 1;
      continue;
    }
    const next = visibleIds[i + 1];
    if (next === 'consumption_saving') {
      rows.push([id]);
      rows.push(['consumption_saving']);
      i += 2;
      continue;
    }
    if (next != null) {
      rows.push([id, next]);
      i += 2;
    } else {
      rows.push([id]);
      i += 1;
    }
  }
  return rows;
}

export function parseCustomizedWidgetVisibilityFromStorage(
  storageKey = CUSTOMIZED_WIDGET_VISIBILITY_STORAGE_KEY
) {
  try {
    const raw = localStorage.getItem(storageKey);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function readDashboardPageOrder(
  page,
  storageKey = DASHBOARD_ORDER_STORAGE_KEY
) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const list = parsed && typeof parsed === 'object' ? parsed?.[page] : null;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeDashboardPageOrder(
  page,
  nextOrder,
  storageKey = DASHBOARD_ORDER_STORAGE_KEY
) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    const obj = parsed && typeof parsed === 'object' ? parsed : {};
    obj[page] = Array.isArray(nextOrder) ? nextOrder : [];
    localStorage.setItem(storageKey, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function readDashboardPageSpan(
  page,
  storageKey = DASHBOARD_ORDER_STORAGE_KEY
) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const map = parsed && typeof parsed === 'object' ? parsed?.[`${page}Span`] : null;
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  } catch {
    return {};
  }
}

export function writeDashboardPageSpan(
  page,
  nextSpan,
  storageKey = DASHBOARD_ORDER_STORAGE_KEY
) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    const obj = parsed && typeof parsed === 'object' ? parsed : {};
    obj[`${page}Span`] =
      nextSpan && typeof nextSpan === 'object' && !Array.isArray(nextSpan) ? nextSpan : {};
    localStorage.setItem(storageKey, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function mergeVisibleDashboardOrder(currentOrder, visibleKeys) {
  const order = Array.isArray(currentOrder) ? currentOrder : [];
  const keys = Array.isArray(visibleKeys) ? visibleKeys : [];
  return [
    ...order.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !order.includes(key)),
  ];
}

export function sortItemsByDashboardOrder(items, mergedOrder, getKey = (item) => item?.key) {
  const orderIndex = new Map(
    (Array.isArray(mergedOrder) ? mergedOrder : []).map((key, index) => [key, index])
  );
  return [...(Array.isArray(items) ? items : [])].sort(
    (a, b) =>
      (orderIndex.get(getKey(a)) ?? 9999) - (orderIndex.get(getKey(b)) ?? 9999)
  );
}

export function resolveOrderedVisibleDashboardCards(cards, currentOrder) {
  const visibleKeys = (Array.isArray(cards) ? cards : []).map((card) => card.key);
  const mergedOrder = mergeVisibleDashboardOrder(currentOrder, visibleKeys);
  return {
    mergedOrder,
    orderedCards: sortItemsByDashboardOrder(cards, mergedOrder, (card) => card.key),
    visibleCount: visibleKeys.length,
  };
}

export function resolveEnergyGridColumnTemplate(visibleCount) {
  return visibleCount === 1 ? '1fr' : '1fr 1fr';
}

export function resolveEnergyCardColumnSpan(key, spanMap, visibleCount) {
  if (visibleCount === 1) return 12;
  const raw = spanMap?.[key];
  return raw === 12 || raw === '12' ? 12 : 6;
}

export function filterItemsByWidgetVisibility(items, shouldRenderWidget, getKey = (item) => item?.key) {
  return (Array.isArray(items) ? items : []).filter((item) =>
    shouldRenderWidget(getKey(item))
  );
}
