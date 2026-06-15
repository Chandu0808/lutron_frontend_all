import React from 'react';
import { Box } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { SpaceWidgetRenderer } from '../../../../shared/dashboard/space/container';

const chartEventHandlers = {
  onMouseDown: (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  },
  onMouseUp: (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  },
  onClick: (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  },
  onDoubleClick: (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  },
  onContextMenu: (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  },
};

const SLOT_EXPORT = {
  instant_occupancy_count: {
    dropdownKey: 'instant',
    titleKey: 'instant_occupancy_count',
    fallback: 'Instant Occupancy Count',
  },
  utilization: { dropdownKey: 'line', titleKey: 'utilization', fallback: 'Utilization' },
  utilization_by_area_group: {
    dropdownKey: 'pie',
    titleKey: 'utilization_by_area_group',
    fallbackCharts: 'Occupancy by Group',
    fallbackMain: 'Utilization By Area Groups',
  },
  utilization_by_area: {
    dropdownKey: 'table',
    titleKey: 'utilization_by_area',
    fallback: 'Utilization By Area',
  },
};

const SLOT_CHART_LOADER_HEIGHT = {
  instant_occupancy_count: '350px',
  utilization: '350px',
  utilization_by_area_group: '400px',
};

function resolveTitle(slotId, layoutContext, exportMeta, api) {
  const getWidgetTitle =
    layoutContext?.getWidgetTitle ||
    layoutContext?.widgetRenderContext?.getWidgetTitle;
  const { selectorMode } = layoutContext;
  let title;
  if (slotId === 'utilization_by_area_group') {
    const fallback =
      selectorMode === 'main' ? exportMeta.fallbackMain : exportMeta.fallbackCharts;
    title =
      typeof getWidgetTitle === 'function'
        ? getWidgetTitle(exportMeta.titleKey, fallback)
        : fallback;
  } else {
    title =
      typeof getWidgetTitle === 'function'
        ? getWidgetTitle(exportMeta.titleKey, exportMeta.fallback)
        : exportMeta.fallback;
  }
  if (selectorMode === 'active' && api.generateDynamicChartTitle) {
    return api.generateDynamicChartTitle(title);
  }
  return title;
}

function cardSx(slotId, theme) {
  const base = {
    backgroundColor: 'rgba(128, 120, 100, 0.6)',
    borderRadius: '8px',
    padding: { xs: 2, sm: 2.5, md: 3, lg: 4, xl: 5 },
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #ccc',
  };
  if (slotId === 'utilization_by_area' && theme === 'default_white') {
    return { ...base, backgroundColor: '#fff', border: '1px solid #000' };
  }
  if (slotId === 'utilization' || slotId === 'instant_occupancy_count') {
    return { ...base, minHeight: { xs: '400px', sm: '430px', md: '450px', lg: '470px', xl: '500px' } };
  }
  if (slotId === 'utilization_by_area_group') {
    return { ...base, minHeight: { xs: '350px', sm: '380px', md: '400px', lg: '420px', xl: '450px' } };
  }
  if (slotId === 'peak_and_minimum_utilization') {
    return { ...base, minHeight: { xs: '200px', sm: '220px', md: '240px', lg: '260px', xl: '280px' } };
  }
  if (slotId === 'utilization_by_area') {
    return { ...base, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' };
  }
  return base;
}

export function renderCustomizedSpaceWidgetSlot(slotId, meta, layoutContext, api) {
  const {
    chartHeaderStyle,
    isLargeScreen,
    ExportDropdown,
    showExportDropdown,
    setShowExportDropdown,
    theme,
  } = api;
  const widgetRenderContext = layoutContext.widgetRenderContext;
  if (!widgetRenderContext) return null;

  if (slotId === 'peak_and_minimum_utilization') {
    return (
      <Box sx={cardSx(slotId, theme)} {...chartEventHandlers}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
          }}
        >
          <Box component="h3" sx={chartHeaderStyle}>
            {api.generateDynamicChartTitle(
              api.getWidgetTitle('peak_and_minimum_utilization', 'Peak & Minimum Utilization')
            )}
          </Box>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
          <SpaceWidgetRenderer
            widgetKey="peak_and_minimum_utilization"
            context={{ ...widgetRenderContext, selectorMode: meta.selectorMode }}
          />
        </Box>
      </Box>
    );
  }

  const exportMeta = SLOT_EXPORT[slotId];
  const title = exportMeta ? resolveTitle(slotId, layoutContext, exportMeta, api) : slotId;
  const exportChartTitle =
    layoutContext.selectorMode === 'main' && slotId === 'utilization'
      ? api.getWidgetTitle('utilization', 'Utilization')
      : exportMeta && layoutContext.selectorMode === 'active'
        ? api.generateDynamicChartTitle(
            api.getWidgetTitle(exportMeta.titleKey, exportMeta.fallback)
          )
        : title;

  return (
    <Box sx={cardSx(slotId, theme)} {...chartEventHandlers}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom:
            slotId === 'utilization_by_area_group'
              ? { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 }
              : { xs: 2, sm: 2.5, md: 3, lg: 4, xl: 5 },
        }}
      >
        <Box component="h3" sx={chartHeaderStyle}>
          {title}
        </Box>
        {exportMeta ? (
          <Box sx={{ position: 'relative' }}>
            <button
              onClick={() =>
                setShowExportDropdown((prev) => ({
                  ...prev,
                  [exportMeta.dropdownKey]: !prev[exportMeta.dropdownKey],
                }))
              }
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: isLargeScreen ? '16px' : '14px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: isLargeScreen ? '8px 12px' : '6px 10px',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
              }}
            >
              <FileUploadIcon fontSize="small" /> Export
            </button>
            <ExportDropdown
              isOpen={showExportDropdown[exportMeta.dropdownKey]}
              onClose={() =>
                setShowExportDropdown((prev) => ({ ...prev, [exportMeta.dropdownKey]: false }))
              }
              chartTitle={exportChartTitle}
              dropdownKey={exportMeta.dropdownKey}
            />
          </Box>
        ) : null}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <SpaceWidgetRenderer
          widgetKey={meta.widgetKey}
          context={{ ...widgetRenderContext, selectorMode: meta.selectorMode }}
          chartLoaderHeight={
            slotId === 'utilization' || slotId === 'instant_occupancy_count'
              ? '100%'
              : SLOT_CHART_LOADER_HEIGHT[slotId]
          }
        />
      </Box>
    </Box>
  );
}

export { createAdvancedSpaceLayoutAdapterStyles as createCustomizedSpaceLayoutAdapterStyles } from '../../../advanced/screens/dashboard/advancedSpaceLayoutSlots';
