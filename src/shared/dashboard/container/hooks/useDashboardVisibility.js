import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyEnergyChartOrderForVisibility,
  buildEnergyDashboardRows,
  deriveEnergyChartOrderFromWidgetTitles,
  ENERGY_CHART_ORDER_STORAGE_KEY,
  hasStoredEnergyChartOrder,
  isCanonicalDefaultEnergyOrder,
  loadEnergyChartOrderFromStorage,
  mergeVisibleDashboardOrder,
  normalizeEnergySlotOrder,
  parseCustomizedWidgetVisibilityFromStorage,
  readDashboardPageOrder,
  readDashboardPageSpan,
  resolveEnergyAllVisible,
  resolveEnergyCardColumnSpan,
  resolveEnergyGridColumnTemplate,
  resolveEnergyVisibleSlotOrder,
  resolveOrderedVisibleDashboardCards,
  resolveShowEnergyStandaloneDurationFilter,
  sortItemsByDashboardOrder,
  writeDashboardPageOrder,
  writeDashboardPageSpan,
  clearDragTranslateKeys,
  ENERGY_CHART_SLOT_ORDER_DEFAULT,
} from '../dashboardLayoutResolvers';
import {
  createVisibilityOrderSignature,
  hasVisibilityOrderSignatureChanged,
} from '../visibilityMemoCompare';
import { resolveCustomizedEnergyWidgetVisible, resolveEnergyWidgetVisible } from './widgetVisibilityResolvers';

function useBasicDashboardVisibility({
  visibilityMap,
  isWidgetVisible,
  energyReflowLocked = false,
  dispatch,
  saveDashboardChartOrder,
  dashboardChartOrder,
  dashboardChartOrderStatus,
  widgetList,
  dragTranslateKeys = [],
}) {
  const [energyChartOrder, setEnergyChartOrder] = useState(() => loadEnergyChartOrderFromStorage());
  const appliedEnergyOrderFromApiRef = useRef(false);
  const prevEnergyVisibleSigRef = useRef('');
  const prevEnergyCombinedVisibleRef = useRef(null);

  const energyAllVisible = useMemo(
    () => resolveEnergyAllVisible(visibilityMap),
    [visibilityMap]
  );

  const energyVisibleSlotOrder = useMemo(
    () => resolveEnergyVisibleSlotOrder(visibilityMap),
    [visibilityMap]
  );

  const energyHiddenSlotIds = useMemo(() => {
    const visibleSet = new Set(energyVisibleSlotOrder);
    return energyChartOrder.filter((id) => !visibleSet.has(id));
  }, [energyChartOrder, energyVisibleSlotOrder]);

  const showEnergyStandaloneDurationFilter = useMemo(
    () => resolveShowEnergyStandaloneDurationFilter(visibilityMap, energyVisibleSlotOrder),
    [visibilityMap, energyVisibleSlotOrder]
  );

  const energyDashboardRows = useMemo(
    () => buildEnergyDashboardRows(energyVisibleSlotOrder),
    [energyVisibleSlotOrder]
  );

  useEffect(() => {
    if (!energyAllVisible) return;
    if (isCanonicalDefaultEnergyOrder(energyChartOrder)) return;
    const merged = normalizeEnergySlotOrder([...ENERGY_CHART_SLOT_ORDER_DEFAULT]);
    setEnergyChartOrder(merged);
    try {
      localStorage.setItem(ENERGY_CHART_ORDER_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
    clearDragTranslateKeys(dragTranslateKeys);
    if (!energyReflowLocked && dispatch && saveDashboardChartOrder) {
      dispatch(saveDashboardChartOrder({ energy_slot_order: merged }));
    }
  }, [
    energyAllVisible,
    energyChartOrder,
    energyReflowLocked,
    dispatch,
    saveDashboardChartOrder,
    dragTranslateKeys,
  ]);

  useEffect(() => {
    const sig = createVisibilityOrderSignature(energyVisibleSlotOrder);
    if (hasVisibilityOrderSignatureChanged(prevEnergyVisibleSigRef.current, energyVisibleSlotOrder)) {
      clearDragTranslateKeys(dragTranslateKeys);
    }
    prevEnergyVisibleSigRef.current = sig;
  }, [energyVisibleSlotOrder, dragTranslateKeys]);

  useEffect(() => {
    const combinedOn = isWidgetVisible('consumption_saving');
    const combinedVisibilityChanged =
      prevEnergyCombinedVisibleRef.current !== null &&
      prevEnergyCombinedVisibleRef.current !== combinedOn;
    prevEnergyCombinedVisibleRef.current = combinedOn;

    setEnergyChartOrder((prev) => {
      const next = applyEnergyChartOrderForVisibility(prev, visibilityMap);
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      if (combinedVisibilityChanged) {
        clearDragTranslateKeys(dragTranslateKeys);
      }
      try {
        localStorage.setItem(ENERGY_CHART_ORDER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if (!energyReflowLocked && dispatch && saveDashboardChartOrder) {
        dispatch(saveDashboardChartOrder({ energy_slot_order: next }));
      }
      return next;
    });
  }, [
    visibilityMap,
    isWidgetVisible,
    energyReflowLocked,
    dispatch,
    saveDashboardChartOrder,
    dragTranslateKeys,
  ]);

  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return;
    const raw = dashboardChartOrder?.energy_slot_order;
    if (!Array.isArray(raw) || raw.length === 0) return;
    const merged = normalizeEnergySlotOrder(raw);
    if (isCanonicalDefaultEnergyOrder(merged) && hasStoredEnergyChartOrder()) {
      try {
        const localMerged = loadEnergyChartOrderFromStorage();
        if (!isCanonicalDefaultEnergyOrder(localMerged)) {
          return;
        }
      } catch {
        /* apply merged below */
      }
    }
    const ordered = applyEnergyChartOrderForVisibility(merged, visibilityMap);
    setEnergyChartOrder(ordered);
    try {
      localStorage.setItem(ENERGY_CHART_ORDER_STORAGE_KEY, JSON.stringify(ordered));
    } catch {
      /* ignore */
    }
    appliedEnergyOrderFromApiRef.current = true;
  }, [dashboardChartOrder, dashboardChartOrderStatus, visibilityMap]);

  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return;
    const raw = dashboardChartOrder?.energy_slot_order;
    if (Array.isArray(raw) && raw.length > 0) return;
    if (!hasStoredEnergyChartOrder()) return;
    const ordered = applyEnergyChartOrderForVisibility(
      loadEnergyChartOrderFromStorage(),
      visibilityMap
    );
    setEnergyChartOrder(ordered);
    appliedEnergyOrderFromApiRef.current = true;
  }, [dashboardChartOrder, dashboardChartOrderStatus, visibilityMap]);

  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return;
    if (appliedEnergyOrderFromApiRef.current) return;
    if (hasStoredEnergyChartOrder()) {
      appliedEnergyOrderFromApiRef.current = true;
      return;
    }
    const titles = widgetList?.titles;
    if (!Array.isArray(titles) || titles.length === 0) return;
    setEnergyChartOrder(deriveEnergyChartOrderFromWidgetTitles(widgetList));
    appliedEnergyOrderFromApiRef.current = true;
  }, [widgetList, dashboardChartOrderStatus]);

  const shouldRenderWidget = useCallback(
    (widgetKey) => resolveEnergyWidgetVisible(widgetKey, { variant: 'basic', visibilityMap }),
    [visibilityMap]
  );

  return {
    isWidgetVisible,
    visibilityMap,
    shouldRenderWidget,
    energyChartOrder,
    setEnergyChartOrder,
    energyVisibleSlotOrder,
    energyHiddenSlotIds,
    showEnergyStandaloneDurationFilter,
    energyAllVisible,
    energyDashboardRows,
  };
}

function useAdvancedDashboardVisibility({ showOverviewTab = true } = {}) {
  const isWidgetVisible = useCallback(() => true, []);
  const shouldRenderWidget = useCallback(() => true, []);

  return {
    isWidgetVisible,
    visibilityMap: {},
    shouldRenderWidget,
    showOverviewTab,
  };
}

function useCustomizedDashboardVisibility({
  locationPathname,
  getEffectiveBuiltinDashboardPage,
  dispatch,
  fetchRenameWidgets,
  fetchCustomGraphs,
}) {
  const [widgetVisibility, setWidgetVisibility] = useState(() =>
    parseCustomizedWidgetVisibilityFromStorage()
  );
  const [energyCardOrder, setEnergyCardOrder] = useState([]);
  const [energyCardSpan, setEnergyCardSpan] = useState({});

  useEffect(() => {
    setWidgetVisibility(parseCustomizedWidgetVisibilityFromStorage());
  }, [locationPathname]);

  useEffect(() => {
    const refreshFromStorage = () => {
      setWidgetVisibility(parseCustomizedWidgetVisibilityFromStorage());
    };

    const onCustomEvent = () => refreshFromStorage();
    const onStorage = (event) => {
      if (!event || event.key === 'widgetVisibility') refreshFromStorage();
    };

    const onWidgetTitlesUpdated = () => {
      if (dispatch && fetchRenameWidgets) dispatch(fetchRenameWidgets());
    };
    const onCustomGraphsUpdated = () => {
      if (dispatch && fetchCustomGraphs) dispatch(fetchCustomGraphs());
    };

    window.addEventListener('widgetVisibilityUpdated', onCustomEvent);
    window.addEventListener('widgetTitlesUpdated', onWidgetTitlesUpdated);
    window.addEventListener('customGraphsUpdated', onCustomGraphsUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('widgetVisibilityUpdated', onCustomEvent);
      window.removeEventListener('widgetTitlesUpdated', onWidgetTitlesUpdated);
      window.removeEventListener('customGraphsUpdated', onCustomGraphsUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [dispatch, fetchRenameWidgets, fetchCustomGraphs]);

  useEffect(() => {
    setEnergyCardOrder(readDashboardPageOrder('energy'));
    setEnergyCardSpan(readDashboardPageSpan('energy'));
  }, []);

  const shouldRenderWidget = useCallback(
    (widgetKey) =>
      resolveCustomizedEnergyWidgetVisible(
        widgetKey,
        widgetVisibility,
        getEffectiveBuiltinDashboardPage || (() => 'energy')
      ),
    [widgetVisibility, getEffectiveBuiltinDashboardPage]
  );

  const shouldShowEnergyWidget = shouldRenderWidget;

  const getEnergyCardCol = useCallback(
    (key, visibleCount) => resolveEnergyCardColumnSpan(key, energyCardSpan, visibleCount),
    [energyCardSpan]
  );

  const resolveEnergyCardLayout = useCallback(
    (cards) => resolveOrderedVisibleDashboardCards(cards, energyCardOrder),
    [energyCardOrder]
  );

  const writeEnergyCardOrder = useCallback((nextOrder) => {
    setEnergyCardOrder(nextOrder);
    writeDashboardPageOrder('energy', nextOrder);
  }, []);

  const writeEnergyCardSpan = useCallback((nextSpan) => {
    setEnergyCardSpan(nextSpan);
    writeDashboardPageSpan('energy', nextSpan);
  }, []);

  const energyGridColumnTemplate = useCallback(
    (visibleCount) => resolveEnergyGridColumnTemplate(visibleCount),
    []
  );

  return {
    widgetVisibility,
    shouldRenderWidget,
    shouldShowEnergyWidget,
    energyCardOrder,
    setEnergyCardOrder,
    energyCardSpan,
    setEnergyCardSpan,
    getEnergyCardCol,
    resolveEnergyCardLayout,
    writeEnergyCardOrder,
    writeEnergyCardSpan,
    energyGridColumnTemplate,
    mergeVisibleDashboardOrder,
    sortItemsByDashboardOrder,
  };
}

export function useDashboardVisibility(options = {}) {
  const { variant = 'basic' } = options;

  if (variant === 'advanced') {
    return useAdvancedDashboardVisibility(options);
  }

  if (variant === 'customized') {
    return useCustomizedDashboardVisibility(options);
  }

  return useBasicDashboardVisibility(options);
}
