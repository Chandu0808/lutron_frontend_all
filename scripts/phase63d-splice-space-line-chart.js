/**
 * Splice shared SpaceLineChart adapter into variant SpaceUtilization.jsx files.
 */
const fs = require('fs');
const path = require('path');

const IMPORT_LINE =
  "import SpaceLineChartAdapter from '../../../../shared/dashboard/charts/space/SpaceLineChartAdapter'";
const IMPORT_THEME =
  "import { SPACE_LINE_CHART_THEME_PRESETS } from '../../../../shared/dashboard/charts/space/spaceLineChartTheme'";

const VARIANTS = [
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'space-line-chart-basic.jsx'),
    startMarker: '  // Occupancy trends chart (filled area under curve — same data/tooltips as before)',
    endMarker: '  // Pie Chart Component for Area Groups - Updated to use percentages',
    importMarker: "import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'",
    removeImports: [
      "import { spaceOccupancyToRecharts } from '../../../../shared/dashboard/charts/transforms/spaceOccupancyToRecharts'",
      "import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'",
    ],
  },
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'advanced', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'space-line-chart-advanced.jsx'),
    startMarker: '  // Line Chart Component - Remove hardcoded sample data',
    endMarker: '  // Pie Chart Component for Area Groups - Updated to use percentages',
    importMarker: "import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'",
    removeImports: [
      "import { spaceOccupancyToRecharts } from '../../../../shared/dashboard/charts/transforms/spaceOccupancyToRecharts'",
      "import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'",
    ],
  },
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'customized', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'space-line-chart-customized.jsx'),
    startMarker: '  // Line Chart Component - Remove hardcoded sample data',
    endMarker: '  // Pie Chart Component for Area Groups - Updated to use percentages',
    importMarker: "import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'",
    removeImports: [
      "import { spaceOccupancyToRecharts } from '../../../../shared/dashboard/charts/transforms/spaceOccupancyToRecharts'",
      "import { formatSpaceOccupancyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatSpaceOccupancyXAxisLabel'",
    ],
  },
];

function spliceVariant({ file, fragment, startMarker, endMarker, importMarker, removeImports }) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes(IMPORT_LINE)) {
    if (!content.includes(importMarker)) {
      throw new Error(`import marker missing in ${file}`);
    }
    content = content.replace(importMarker, `${IMPORT_LINE}\n${importMarker}`);
  }

  for (const line of removeImports) {
    content = content.replace(`${line}\n`, '');
  }

  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`markers not found in ${file}`);
  }

  const fragmentBody = fs.readFileSync(fragment, 'utf8');
  content = content.slice(0, start) + fragmentBody + content.slice(end);
  fs.writeFileSync(file, content);
  console.log('spliced', file);
}

for (const variant of VARIANTS) {
  spliceVariant(variant);
}

console.log('done');
