#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function sliceFormatter(srcRel, startLine, endLine, exportName, doc) {
  const lines = fs.readFileSync(path.join(ROOT, srcRel), 'utf8').split(/\r?\n/);
  const body = lines
    .slice(startLine, endLine)
    .map((l) => l.replace(/^      /, ''))
    .join('\n')
    .replace(/^const formatXAxisLabel = useCallback\(\(value\) => \{\n/, '')
    .replace(/\n  \}, \[selectedDuration, currentDate, currentYear, customDateRange\]\);?\s*$/, '');

  return `import { parseDateFromState } from '../../utils/dashboardDateState';
import { MONTH_NAME_TO_INDEX } from './chartTransformConstants';

/** ${doc} */
export function ${exportName}(value, options = {}) {
  const {
    selectedDuration,
    currentDate,
    currentYear,
    customDateRange = { startDate: '', endDate: '' },
  } = options;

${body}
}
`;
}

const occupancy = sliceFormatter(
  'src/variants/basic/screens/dashboard/SpaceUtilization.jsx',
  2979,
  3182,
  'formatSpaceOccupancyXAxisLabel',
  'Space LineChartComponent X-axis formatter'
);

const instant = sliceFormatter(
  'src/variants/basic/screens/dashboard/SpaceUtilization.jsx',
  4562,
  4770,
  'formatSpaceInstantOccupancyXAxisLabel',
  'Space InstantOccupancyChartComponent X-axis formatter'
);

const dir = path.join(ROOT, 'src/shared/dashboard/charts/transforms');
fs.writeFileSync(path.join(dir, 'formatSpaceOccupancyXAxisLabel.js'), occupancy);
fs.writeFileSync(path.join(dir, 'formatSpaceInstantOccupancyXAxisLabel.js'), instant);
console.log('Wrote space axis formatters', occupancy.split('\n').length, instant.split('\n').length);
