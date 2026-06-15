/**
 * Phase 6.2A.2 — wire shared export foundation into variant Dashboard/SpaceUtilization.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'variants');

const EXPORT_IMPORT =
  "import { buildChartApiParams, resolveSpaceExportThunks } from '../../../../shared/dashboard/export'";

const ENERGY_DASHBOARD_IMPORT =
  "import { buildChartApiParams, resolveEnergyExportByApiPath } from '../../../../shared/dashboard/export'";

const CUSTOMIZED_DASHBOARD_IMPORT =
  "import { buildChartApiParams, resolveEnergyExportByApiPath } from '../../../../shared/dashboard/export'";

const API_PARAMS_BLOCK = `      const apiParams = {
        // CRITICAL FIX: When floors are selected, prioritize floor-level filtering
        areaIds: (selectedFloorIds && selectedFloorIds.length > 0) ? [] : (selectedAreas.length > 0 ? selectedAreas : []),
        floorIds: selectedFloorIds && selectedFloorIds.length > 0 ? selectedFloorIds : [],
        timeRange: selectedDuration,
        startDate: customStartDate,
        endDate: customEndDate,
        isNavigating: isNavigating
      };`;

const API_PARAMS_REPLACEMENT = `      const apiParams = buildChartApiParams({
        selectedAreas,
        selectedFloorIds,
        timeRange: selectedDuration,
        startDate: customStartDate,
        endDate: customEndDate,
        isNavigating,
      });`;

const API_PARAMS_BLOCK_CORRECT = `      const apiParams = {
        // CORRECT LOGIC: If floor is selected, send ONLY floorIds, NOT areaIds
        areaIds: (selectedFloorIds && selectedFloorIds.length > 0) ? [] : (selectedAreas.length > 0 ? selectedAreas : []),
        floorIds: selectedFloorIds && selectedFloorIds.length > 0 ? selectedFloorIds : [],
        timeRange: selectedDuration,
        startDate: customStartDate,
        endDate: customEndDate,
        isNavigating: isNavigating,
      };`;

const GROUP_API_PARAMS_OLD = `      const apiParams = {
        // CRITICAL FIX: When floors are selected, prioritize floor-level filtering
        areaIds: (selectedFloorIds && selectedFloorIds.length > 0) ? [] : (selectedAreas.length > 0 ? selectedAreas : []),
        floorIds: selectedFloorIds && selectedFloorIds.length > 0 ? selectedFloorIds : [],
        timeRange: timeRange,
        startDate: startDate,
        endDate: endDate
      };`;

const GROUP_API_PARAMS_NEW = `      const apiParams = buildChartApiParams({
        selectedAreas,
        selectedFloorIds,
        timeRange,
        startDate,
        endDate,
        includeNavigating: false,
      });`;

const SPACE_API_PARAMS_BASIC = `      const apiParams = {
        // CORRECT LOGIC: If floor is selected, send ONLY floorIds, NOT areaIds
        areaIds: (selectedFloorIds && selectedFloorIds.length > 0) ? [] : (selectedAreas.length > 0 ? selectedAreas : []),
        floorIds: selectedFloorIds && selectedFloorIds.length > 0 ? selectedFloorIds : [],
        timeRange: selectedDuration,
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
        isNavigating: isNavigating
      };`;

const SPACE_API_PARAMS_BASIC_NEW = `      const spaceExportThunks = {
        sendInstantOccupancyCountEmail,
        downloadInstantOccupancyCount,
        sendOccupancyCountEmail,
        downloadOccupancyCount,
        sendOccupancyByGroupFromLogsEmail,
        downloadOccupancyByGroupFromLogs,
        sendOccupancyByGroupEmail,
        downloadOccupancyByGroup,
        sendSpaceUtilizationPerFromLogsEmail,
        downloadSpaceUtilizationPerFromLogs,
        sendSpaceUtilizationPerEmail,
        downloadSpaceUtilizationPer,
      };

      const apiParams = buildChartApiParams({
        selectedAreas,
        selectedFloorIds,
        timeRange: selectedDuration,
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
        isNavigating,
      });`;

const SPACE_API_PARAMS_CUSTOMIZED = `      const apiParams = {
        // CORRECT LOGIC: If floor is selected, send ONLY floorIds, NOT areaIds
        areaIds: (selectedFloorIds && selectedFloorIds.length > 0) ? [] : (selectedAreas.length > 0 ? selectedAreas : []),
        floorIds: selectedFloorIds && selectedFloorIds.length > 0 ? selectedFloorIds : [],
        groupIds: selectedGroupIds && selectedGroupIds.length > 0 ? selectedGroupIds : [],
        timeRange: selectedDuration,
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
        isNavigating: isNavigating
      };`;

const SPACE_API_PARAMS_CUSTOMIZED_NEW = `      const spaceExportThunks = {
        sendInstantOccupancyCountEmail,
        downloadInstantOccupancyCount,
        sendOccupancyCountEmail,
        downloadOccupancyCount,
        sendOccupancyByGroupFromLogsEmail,
        downloadOccupancyByGroupFromLogs,
        sendOccupancyByGroupEmail,
        downloadOccupancyByGroup,
        sendSpaceUtilizationPerFromLogsEmail,
        downloadSpaceUtilizationPerFromLogs,
        sendSpaceUtilizationPerEmail,
        downloadSpaceUtilizationPer,
      };

      const apiParams = buildChartApiParams({
        selectedAreas,
        selectedFloorIds,
        selectedGroupIds,
        timeRange: selectedDuration,
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
        isNavigating,
      });`;

function addImportAfter(content, marker, importLine) {
  if (content.includes(importLine)) return content;
  const idx = content.indexOf(marker);
  if (idx === -1) throw new Error(`Marker not found: ${marker}`);
  const lineEnd = content.indexOf('\n', idx);
  return content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);
}

function wireDashboard(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = addImportAfter(
    content,
    "import { useAreaTreeSelection } from '../../../../shared/dashboard/hooks/useAreaTreeSelection'",
    ENERGY_DASHBOARD_IMPORT
  );

  content = content.split(API_PARAMS_BLOCK).join(API_PARAMS_REPLACEMENT);
  content = content.split(API_PARAMS_BLOCK_CORRECT).join(API_PARAMS_REPLACEMENT);
  content = content.split(GROUP_API_PARAMS_OLD).join(GROUP_API_PARAMS_NEW);

  // customized handleEnergyCustomGraphExport apiParams
  const customGraphOld = `      const apiParams = {
        // CRITICAL FIX: When floors are selected, prioritize floor-level filtering
        areaIds: (selectedFloorIds && selectedFloorIds.length > 0) ? [] : (selectedAreas.length > 0 ? selectedAreas : []),
        floorIds: selectedFloorIds && selectedFloorIds.length > 0 ? selectedFloorIds : [],
        timeRange: selectedDuration,
        startDate: customStartDate,
        endDate: customEndDate,
        isNavigating: isNavigating,
      };`;
  content = content.split(customGraphOld).join(API_PARAMS_REPLACEMENT);

  fs.writeFileSync(filePath, content);
  console.log('wired dashboard', filePath);
}

function replaceSpaceEmailRouting(content) {
  const emailStart = `            let result;
            // Use dropdownKey and chartTitle to identify the chart type`;
  const emailReplacement = `            const resolved = resolveSpaceExportThunks(
              { showChartsTab, dropdownKey, chartTitle },
              spaceExportThunks
            );
            const emailThunk = resolved?.emailThunk;
            let result;
            if (emailThunk) {
              result = await dispatch(emailThunk({ toEmail: email, ...apiParams }));
            }`;

  if (!content.includes(emailStart)) return content;
  const idx = content.indexOf(emailStart);
  const endMarkers = [
    `            } else if (chartTitle.includes('Utilization') && !chartTitle.includes('Area') && !chartTitle.includes('Occupancy by Group')) {
              // Utilization chart (occupancy count) - regular endpoint for Space Utilization tab
              result = await dispatch(sendOccupancyCountEmail({ toEmail: email, ...apiParams }));
            }`,
    `            } else if (chartTitle.includes('Utilization') && !chartTitle.includes('Area') && !chartTitle.includes('Occupancy by Group')) {
              // Utilization chart (occupancy count) - regular endpoint for Space Utilization tab
              result = await dispatch(sendOccupancyCountEmail({ toEmail: email, ...apiParams }));
            }\n`,
  ];

  let endIdx = -1;
  for (const marker of endMarkers) {
    const pos = content.indexOf(marker, idx);
    if (pos !== -1) {
      endIdx = pos + marker.length;
      break;
    }
  }
  if (endIdx === -1) throw new Error('email routing end not found');

  return content.slice(0, idx) + emailReplacement + content.slice(endIdx);
}

function replaceSpaceDownloadRouting(content) {
  const dlStart = `          let result;
          // Use dropdownKey and chartTitle to identify the chart type`;
  const dlReplacement = `          const resolved = resolveSpaceExportThunks(
            { showChartsTab, dropdownKey, chartTitle },
            spaceExportThunks
          );
          const downloadThunk = resolved?.downloadThunk;
          let result;
          if (downloadThunk) {
            result = await dispatch(downloadThunk(apiParams));
          }`;

  const firstIdx = content.indexOf(dlStart);
  if (firstIdx === -1) return content;
  const idx = content.indexOf(dlStart, firstIdx + 1);
  if (idx === -1) return content;

  const endMarker = `          } else if (chartTitle.includes('Utilization') && !chartTitle.includes('Area') && !chartTitle.includes('Occupancy by Group')) {
            // Utilization chart (occupancy count) - regular endpoint for Space Utilization tab
            result = await dispatch(downloadOccupancyCount(apiParams));
          }`;
  const endIdx = content.indexOf(endMarker, idx);
  if (endIdx === -1) throw new Error('download routing end not found');
  const afterEnd = endIdx + endMarker.length;

  return content.slice(0, idx) + dlReplacement + content.slice(afterEnd);
}

function wireSpaceUtil(filePath, variant) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = addImportAfter(
    content,
    "import { formatDateForState, parseDateFromState } from '../../../../shared/dashboard/utils/dashboardDateState'",
    EXPORT_IMPORT
  );

  if (variant === 'customized') {
    content = content.replace(SPACE_API_PARAMS_CUSTOMIZED, SPACE_API_PARAMS_CUSTOMIZED_NEW);
  } else {
    content = content.replace(SPACE_API_PARAMS_BASIC, SPACE_API_PARAMS_BASIC_NEW);
  }

  content = replaceSpaceEmailRouting(content);
  content = replaceSpaceDownloadRouting(content);

  fs.writeFileSync(filePath, content);
  console.log('wired space', filePath);
}

function wireCustomizedEnergyGraphExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const matchFnStart = '      const match = () => {';
  const matchFnEnd = '      const resolved = match();';
  const startIdx = content.indexOf(matchFnStart);
  const endIdx = content.indexOf(matchFnEnd);
  if (startIdx === -1 || endIdx === -1) return;

  const energyCustomThunks = `      const energyCustomExportThunks = {
        sendEnergyConsumptionEmail,
        sendEnergySavingsEmail,
        sendPeakMinConsumptionEmail,
        sendTotalConsumptionByGroupEmail,
        sendOccupancyCountEmail,
        sendOccupancyByGroupEmail,
        sendSpaceUtilizationPerEmail,
        downloadEnergyConsumption,
        downloadEnergySavings,
        downloadPeakMinConsumption,
        downloadTotalConsumptionByGroup,
        downloadOccupancyCount,
        downloadOccupancyByGroup,
        downloadSpaceUtilizationPer,
      };

      const resolved = resolveEnergyExportByApiPath(apiPath, energyCustomExportThunks);`;

  content = content.slice(0, startIdx) + energyCustomThunks + content.slice(endIdx + matchFnEnd.length);
  fs.writeFileSync(filePath, content);
  console.log('wired customized energy graph export', filePath);
}

['basic', 'advanced', 'customized'].forEach((variant) => {
  wireDashboard(path.join(ROOT, variant, 'screens', 'dashboard', 'Dashboard.jsx'));
  wireSpaceUtil(path.join(ROOT, variant, 'screens', 'dashboard', 'SpaceUtilization.jsx'), variant);
});

wireCustomizedEnergyGraphExport(
  path.join(ROOT, 'customized', 'screens', 'dashboard', 'Dashboard.jsx')
);

console.log('Phase 6.2A.2 wiring complete');
