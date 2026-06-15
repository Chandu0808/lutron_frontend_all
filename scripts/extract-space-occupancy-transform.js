#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const srcPath = path.join(ROOT, 'src/variants/basic/screens/dashboard/SpaceUtilization.jsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const start = lines.findIndex((l) => l.includes("const allData = chartData['x-axis'].map"));
let end = -1;
for (let i = start; i < lines.length; i++) {
  if (lines[i].includes('// Always show the chart with the data received from backend')) {
    end = i - 1;
    break;
  }
}

const body = lines
  .slice(start, end + 1)
  .map((l) => l.replace(/^      /, ''))
  .join('\n');

const out = `import { parseDateFromState } from '../../utils/dashboardDateState';
import { MONTH_NAME_TO_INDEX } from './chartTransformConstants';

/**
 * Space utilization occupancy API payload -> Recharts row data.
 * Extracted from variant SpaceUtilization.jsx LineChartComponent.
 */
export function spaceOccupancyToRecharts(chartData, options = {}) {
  const {
    selectedDuration,
    currentDate,
    customDateRange = { startDate: '', endDate: '' },
  } = options;

${body}

  return processedChartData;
}
`;

const dest = path.join(ROOT, 'src/shared/dashboard/charts/transforms/spaceOccupancyToRecharts.js');
fs.writeFileSync(dest, out);
console.log('Wrote', dest, 'lines', end - start + 1);
