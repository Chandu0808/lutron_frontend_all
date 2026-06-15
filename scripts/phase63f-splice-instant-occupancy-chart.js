/**
 * Splice shared InstantOccupancyChart adapter into variant SpaceUtilization.jsx files.
 */
const fs = require('fs');
const path = require('path');

const IMPORT_LINE =
  "import InstantOccupancyChartAdapter from '../../../../shared/dashboard/charts/space/InstantOccupancyChartAdapter'";

const VARIANTS = [
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'instant-occupancy-basic.jsx'),
    startMarker:
      '  // Instant Occupancy Count Chart Component (`chartSurface="light"` for combined Space Utilization card)',
    importMarker: "import SpaceStackedBarChartAdapter from '../../../../shared/dashboard/charts/space/SpaceStackedBarChartAdapter'",
  },
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'advanced', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'instant-occupancy-advanced.jsx'),
    startMarker: '  // Instant Occupancy Count Chart Component',
    importMarker: "import SpaceStackedBarChartAdapter from '../../../../shared/dashboard/charts/space/SpaceStackedBarChartAdapter'",
  },
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'customized', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'instant-occupancy-customized.jsx'),
    startMarker: '  // Instant Occupancy Count Chart Component',
    importMarker: "import SpaceStackedBarChartAdapter from '../../../../shared/dashboard/charts/space/SpaceStackedBarChartAdapter'",
  },
];

function spliceVariant({ file, fragment, startMarker, importMarker }) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes(IMPORT_LINE)) {
    if (!content.includes(importMarker)) {
      throw new Error(`import marker missing in ${file}`);
    }
    content = content.replace(importMarker, `${importMarker}\n${IMPORT_LINE}`);
  }

  const start = content.indexOf(startMarker);
  const end = content.indexOf('\n\n  return (\n    <Box', start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`markers not found in ${file}`);
  }

  const fragmentBody = fs.readFileSync(fragment, 'utf8');
  content = content.slice(0, start) + fragmentBody + content.slice(end + 2);
  fs.writeFileSync(file, content);
  console.log('spliced', file);
}

for (const variant of VARIANTS) {
  spliceVariant(variant);
}

console.log('done');
