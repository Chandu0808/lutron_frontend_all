#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const srcPath = path.join(ROOT, 'src/variants/basic/screens/dashboard/Dashboard.jsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const start = lines.findIndex((l) => l.trim().startsWith('const formatXAxisLabel = useCallback((value, index)'));
let end = -1;
let depth = 0;
for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  if (i === start) depth = 0;
  depth += (line.match(/\{/g) || []).length;
  depth -= (line.match(/\}/g) || []).length;
  if (i > start && line.includes('}, [chartData.length, selectedDuration, currentDate]);')) {
    end = i;
    break;
  }
}

let body = lines
  .slice(start + 1, end)
  .map((l) => l.replace(/^    /, ''))
  .join('\n');

body = body.replace(/useCallback\(\(value, index\) => \{/, '(value, index, options = {}) => {');
body = body.replace(/const formatXAxisLabel = /, '');

const out = `import { parseDateFromState } from '../../utils/dashboardDateState';
import { MONTH_NAME_TO_INDEX } from './chartTransformConstants';

/**
 * Energy line chart X-axis tick formatter.
 * Extracted from variant Dashboard.jsx EnergyLineChart.
 */
export function formatEnergyXAxisLabel(value, index, options = {}) {
  const { chartDataLength = 0, selectedDuration, currentDate, currentYear } = options;
  const chartData = { length: chartDataLength };

${body}
}
`;

const dest = path.join(ROOT, 'src/shared/dashboard/charts/transforms/formatEnergyXAxisLabel.js');
fs.writeFileSync(dest, out);
console.log('Wrote', dest);
