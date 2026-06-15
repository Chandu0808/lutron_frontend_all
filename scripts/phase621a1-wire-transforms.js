#!/usr/bin/env node
/**
 * Phase 6.2A.1 — wire shared chart transforms into variant Dashboard/SpaceUtilization
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content);
}

const DASHBOARD_IMPORTS = `import { transformDataForCharts as sharedTransformDataForCharts } from '../../../../shared/dashboard/charts/transforms/transformDataForCharts'
import { calculatePeakMinFromChartData } from '../../../../shared/dashboard/charts/transforms/calculatePeakMinFromChartData'
import { formatPeakMinDisplay as sharedFormatPeakMinDisplay } from '../../../../shared/dashboard/charts/transforms/formatPeakMinDisplay'
import { consumptionSavingMergedData as sharedConsumptionSavingMergedData } from '../../../../shared/dashboard/charts/transforms/consumptionSavingMergedData'
import {
  savingsStrategyToPieRows,
  calculateTotalSavingsPercentage,
  savingsStrategyEntriesFromPayload,
  isSavingsStrategyTransitionalData,
} from '../../../../shared/dashboard/charts/transforms/savingsStrategyToPieRows'
import { formatEnergyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatEnergyXAxisLabel'
`;

const SPACE_IMPORTS = `import { calculatePeakMinFromOccupancyPayload } from '../../../../shared/dashboard/charts/transforms/calculatePeakMinFromOccupancyPayload'
import { formatPeakMinTimeLabel } from '../../../../shared/dashboard/charts/transforms/formatPeakMinTimeLabel'
import { spaceOccupancyToRecharts } from '../../../../shared/dashboard/charts/transforms/spaceOccupancyToRecharts'
import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'
import { formatSpaceInstantOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceInstantOccupancyXAxisLabel'
`;

function addImports(content, marker, block) {
  if (content.includes(block.trim().split('\n')[0])) return content;
  const idx = content.indexOf(marker);
  if (idx < 0) throw new Error(`marker not found: ${marker}`);
  return content.slice(0, idx) + block + content.slice(idx);
}

function replaceBlock(content, startRe, endRe, replacement) {
  const start = content.search(startRe);
  if (start < 0) return content;
  const tail = content.slice(start);
  const endMatch = tail.match(endRe);
  if (!endMatch) return content;
  const end = start + endMatch.index + endMatch[0].length;
  return content.slice(0, start) + replacement + content.slice(end);
}

function wireDashboardBasicAdvanced(rel) {
  let c = read(rel);
  c = addImports(c, "import { useAreaTreeSelection }", DASHBOARD_IMPORTS);

  c = replaceBlock(
    c,
    /\/\/ Update the transformDataForCharts function to handle combined areas\r?\n  const transformDataForCharts = useCallback/,
    /  \}, \[selectedDuration, selectedAreas, areaTree\]\);\r?\n\r?\n  \/\/ Calculate peak and min values from consumption chart data\r?\n  const calculatePeakMinFromChartData = \(chartData\) => \{[\s\S]*?\n  \};\r?\n\r?\n  const energyConsumptionChartData/,
    `  const transformDataForCharts = useCallback((data, chartType = 'consumption') => {
    return sharedTransformDataForCharts(data, chartType, {
      selectedDuration,
      selectedAreas,
      areaTree,
    });
  }, [selectedDuration, selectedAreas, areaTree]);

  const energyConsumptionChartData`
  );

  c = replaceBlock(
    c,
    /  const formatPeakMinDisplay = useCallback\(\r?\n    \(entry\) => \{/,
    /    \[energyConsumption, selectedDuration, currentDate\]\r?\n  \);\r?\n\r?\n  const energyConsumptionPeakMin/,
    `  const formatPeakMinDisplay = useCallback(
    (entry) =>
      sharedFormatPeakMinDisplay(entry, {
        unit: energyConsumption?.unit || '',
        selectedDuration,
        currentDate,
      }),
    [energyConsumption, selectedDuration, currentDate]
  );

  const energyConsumptionPeakMin`
  );

  c = replaceBlock(
    c,
    /  const consumptionSavingMergedData = useMemo\(\(\) => \{\r?\n    const consumptionSeries/,
    /  \}, \[energyConsumption, energySavings, transformDataForCharts\]\)\r?\n\r?\n\r?\n  const isPeakMinLoading/,
    `  const consumptionSavingMergedData = useMemo(() => {
    const consumptionSeries = energyConsumption ? transformDataForCharts(energyConsumption, 'consumption') : []
    const savingsSeries = energySavings ? transformDataForCharts(energySavings, 'other') : []
    return sharedConsumptionSavingMergedData(consumptionSeries, savingsSeries)
  }, [energyConsumption, energySavings, transformDataForCharts])

  const isPeakMinLoading`
  );

  c = c.replace(
    /    const calculateTotalSavingsPercentage = \(\) => \{[\s\S]*?return total;\r?\n    \};\r?\n\r?\n    const totalSavingsPercentage = calculateTotalSavingsPercentage\(\);/,
    `    const totalSavingsPercentage = calculateTotalSavingsPercentage(savingsByStrategy);`
  );

  c = c.replace(
    /    const isTransitionalData = !raw \|\| typeof raw !== 'object'[\s\S]*?\(typeof raw === 'object' && Object\.values\(raw\)\.every\(val => val === 0 \|\| val === null \|\| val === undefined\)\);/,
    `    const isTransitionalData = isSavingsStrategyTransitionalData(savingsByStrategy);`
  );

  c = c.replace(
    /    const entries = Object\.entries\(dataToUse\)\r?\n      \.map\(\(\[name, value\]\) => \(\{ name, value: Number\(value \|\| 0\) \}\)\);\r?\n\r?\n    const total = entries\.reduce\(\(s, d\) => s \+ d\.value, 0\);/,
    `    const entries = savingsStrategyEntriesFromPayload(savingsByStrategy);

    const total = entries.reduce((s, d) => s + d.value, 0);`
  );

  c = c.replace(
    /    const pieData = entries[\s\S]*?percentage: d\.value[\s\S]*?\}\)\);/,
    `    const pieData = savingsStrategyToPieRows(savingsByStrategy);`
  );

  c = replaceBlock(
    c,
    /    const formatXAxisLabel = useCallback\(\(value, index\) => \{/,
    /    \}, \[chartData\.length, selectedDuration, currentDate\]\);\r?\n\r?\n    \/\/ Remove unnecessary chartKey/,
    `    const formatXAxisLabel = useCallback(
      (value, index) =>
        formatEnergyXAxisLabel(value, index, {
          chartDataLength: chartData.length,
          selectedDuration,
          currentDate,
          currentYear,
        }),
      [chartData.length, selectedDuration, currentDate, currentYear]
    );

    // Remove unnecessary chartKey`
  );

  write(rel, c);
  console.log('wired dashboard', rel);
}

function wireDashboardCustomized(rel) {
  let c = read(rel);
  c = addImports(c, "import { useAreaTreeSelection }", DASHBOARD_IMPORTS);

  c = replaceBlock(
    c,
    /\/\/ Update the transformDataForCharts function to handle combined areas\r?\n  const transformDataForCharts = useCallback/,
    /  \}, \[selectedDuration, selectedAreas, areaTree, selectedGroupIds, areaGroups, selectedFloorIds, floors\]\);\r?\n\r?\n  \/\/ Calculate peak and min values from consumption chart data\r?\n  const calculatePeakMinFromChartData = \(chartData\) => \{[\s\S]*?\n  \};\r?\n\r?\n  const energyConsumptionChartData/,
    `  const transformDataForCharts = useCallback((data, chartType = 'consumption', forceIndividualAreas = false, floorIds = null, areaIds = null, groupIds = null) => {
    return sharedTransformDataForCharts(data, chartType, {
      selectedDuration,
      selectedAreas,
      selectedFloorIds,
      selectedGroupIds,
      areaTree,
      areaGroups,
      floors,
      forceIndividualAreas,
      widgetFloorIds: floorIds,
      widgetAreaIds: areaIds,
      widgetGroupIds: groupIds,
    });
  }, [selectedDuration, selectedAreas, areaTree, selectedGroupIds, areaGroups, selectedFloorIds, floors]);

  const energyConsumptionChartData`
  );

  c = replaceBlock(
    c,
    /  const formatPeakMinDisplay = useCallback\(\r?\n    \(entry\) => \{/,
    /    \[energyConsumption, selectedDuration, currentDate\]\r?\n  \);\r?\n\r?\n  const energyConsumptionPeakMin/,
    `  const formatPeakMinDisplay = useCallback(
    (entry) =>
      sharedFormatPeakMinDisplay(entry, {
        unit: energyConsumption?.unit || '',
        selectedDuration,
        currentDate,
      }),
    [energyConsumption, selectedDuration, currentDate]
  );

  const energyConsumptionPeakMin`
  );

  c = c.replace(
    /    const calculateTotalSavingsPercentage = \(\) => \{[\s\S]*?return total;\r?\n    \};\r?\n\r?\n    const totalSavingsPercentage = calculateTotalSavingsPercentage\(\);/,
    `    const totalSavingsPercentage = calculateTotalSavingsPercentage(savingsByStrategy);`
  );

  c = c.replace(
    /    const isTransitionalData = !raw \|\| typeof raw !== 'object'[\s\S]*?\(typeof raw === 'object' && Object\.values\(raw\)\.every\(val => val === 0 \|\| val === null \|\| val === undefined\)\);/,
    `    const isTransitionalData = isSavingsStrategyTransitionalData(savingsByStrategy);`
  );

  c = c.replace(
    /    const entries = Object\.entries\(dataToUse\)\r?\n      \.map\(\(\[name, value\]\) => \(\{ name, value: Number\(value \|\| 0\) \}\)\);\r?\n\r?\n    const total = entries\.reduce\(\(s, d\) => s \+ d\.value, 0\);/,
    `    const entries = savingsStrategyEntriesFromPayload(savingsByStrategy);

    const total = entries.reduce((s, d) => s + d.value, 0);`
  );

  c = c.replace(
    /    const pieData = entries[\s\S]*?percentage: d\.value[\s\S]*?\}\)\);/,
    `    const pieData = savingsStrategyToPieRows(savingsByStrategy);`
  );

  c = replaceBlock(
    c,
    /    const formatXAxisLabel = useCallback\(\(value, index\) => \{/,
    /    \}, \[chartData\.length, selectedDuration, currentDate\]\);\r?\n\r?\n    \/\/ Remove unnecessary chartKey/,
    `    const formatXAxisLabel = useCallback(
      (value, index) =>
        formatEnergyXAxisLabel(value, index, {
          chartDataLength: chartData.length,
          selectedDuration,
          currentDate,
          currentYear,
        }),
      [chartData.length, selectedDuration, currentDate, currentYear]
    );

    // Remove unnecessary chartKey`
  );

  write(rel, c);
  console.log('wired dashboard customized', rel);
}

function wireSpaceUtil(rel) {
  let c = read(rel);
  c = addImports(c, "import { formatDateForState, parseDateFromState }", SPACE_IMPORTS);

  c = replaceBlock(
    c,
    /  const calculatePeakMinFromChartData = \(\) => \{/,
    /  \}\r?\n\r?\n  \/\/ Helper function to format peak\/min time/,
    `  const calculatePeakMinFromChartData = () => {
    try {
      const dataSource = showChartsTab ? instantOccupancyCount : occupancyCount;
      if (!dataSource || dataSource.status === 'error') {
        return { peak: null, min: null, peakTime: null, minTime: null };
      }
      if (!dataSource['x-axis'] || !dataSource['y-axis']) {
        return { peak: null, min: null, peakTime: null, minTime: null };
      }
      return calculatePeakMinFromOccupancyPayload(dataSource);
    } catch (error) {
      return { peak: null, min: null, peakTime: null, minTime: null };
    }
  }

  // Helper function to format peak/min time`
  );

  c = replaceBlock(
    c,
    /  const formatPeakMinTime = useCallback\(\(timeString\) => \{/,
    /  \}, \[selectedDuration, currentDate\]\);\r?\n\r?\n  const renderSpacePeakMinOccupancyCards/,
    `  const formatPeakMinTime = useCallback(
    (timeString) => formatPeakMinTimeLabel(timeString, selectedDuration, currentDate),
    [selectedDuration, currentDate]
  );

  const renderSpacePeakMinOccupancyCards`
  );

  c = replaceBlock(
    c,
    /      \/\/ Process data based on selected duration\r?\n      \/\/ Updated to match backend data structure[\s\S]*?processedChartData = mappedData;\r?\n      \}\r?\n\r?\n      \/\/ Always show the chart with the data received from backend/,
    `      // Process data based on selected duration (shared transform)
      let processedChartData = spaceOccupancyToRecharts(chartData, {
        selectedDuration,
        currentDate,
        customDateRange,
      });

      // Always show the chart with the data received from backend`
  );

  c = replaceBlock(
    c,
    /      const formatXAxisLabel = useCallback\(\(value\) => \{\r?\n        if \(!value && value !== 0\)/,
    /      \}, \[selectedDuration, currentDate, currentYear, customDateRange\]\);\r?\n\r?\n      return \(/,
    `      const formatXAxisLabel = useCallback(
        (value) =>
          formatSpaceOccupancyXAxisLabel(value, {
            selectedDuration,
            currentDate,
            currentYear,
            customDateRange,
          }),
        [selectedDuration, currentDate, currentYear, customDateRange]
      );

      return (`
  );

  c = replaceBlock(
    c,
    /      const formatXAxisLabel = useCallback\(\(value\) => \{\r?\n        if \(!value\) \{\r?\n          return '';\r?\n        \}/,
    /      \}, \[selectedDuration, currentDate, currentYear, customDateRange\]\);\r?\n\r?\n      try \{/,
    `      const formatXAxisLabel = useCallback(
        (value) =>
          formatSpaceInstantOccupancyXAxisLabel(value, {
            selectedDuration,
            currentDate,
            currentYear,
            customDateRange,
          }),
        [selectedDuration, currentDate, currentYear, customDateRange]
      );

      try {`
  );

  write(rel, c);
  console.log('wired space', rel);
}

function wireCustomizedSpaceUtilModuleFunctions(rel) {
  let c = read(rel);
  if (!c.includes('function calculatePeakMinFromOccupancyChartPayload')) return;

  c = addImports(
    c,
    "import { formatDateForState, parseDateFromState }",
    `import { calculatePeakMinFromOccupancyPayload } from '../../../../shared/dashboard/charts/transforms/calculatePeakMinFromOccupancyPayload'
import { formatPeakMinTimeLabel } from '../../../../shared/dashboard/charts/transforms/formatPeakMinTimeLabel'
`
  );

  c = c.replace(
    /\/\*\* Same logic as built-in Peak & Minimum Utilization:[\s\S]*?function calculatePeakMinFromOccupancyChartPayload\(chartData\) \{[\s\S]*?\n\}\r?\n\r?\n/,
    ''
  );

  c = c.replace(
    /\/\*\* Same rules as `formatPeakMinTime` in the component[\s\S]*?function formatPeakMinTimeLabel\(timeString, selectedDuration, currentDate\) \{[\s\S]*?\n\}\r?\n\r?\n/,
    ''
  );

  c = c.replace(/calculatePeakMinFromOccupancyChartPayload/g, 'calculatePeakMinFromOccupancyPayload');

  write(rel, c);
  console.log('wired customized space module fns', rel);
}

['basic', 'advanced'].forEach((v) => {
  wireDashboardBasicAdvanced(`src/variants/${v}/screens/dashboard/Dashboard.jsx`);
  wireSpaceUtil(`src/variants/${v}/screens/dashboard/SpaceUtilization.jsx`);
});

wireDashboardCustomized('src/variants/customized/screens/dashboard/Dashboard.jsx');
wireSpaceUtil('src/variants/customized/screens/dashboard/SpaceUtilization.jsx');
wireCustomizedSpaceUtilModuleFunctions('src/variants/customized/screens/dashboard/SpaceUtilization.jsx');

console.log('done');
