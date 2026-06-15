/**
 * Splice shared SpaceStackedBarChart adapter into variant SpaceUtilization.jsx files.
 */
const fs = require('fs');
const path = require('path');

const IMPORT_LINE =
  "import SpaceStackedBarChartAdapter from '../../../../shared/dashboard/charts/space/SpaceStackedBarChartAdapter'";

const VARIANTS = [
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'space-stacked-bar-basic.jsx'),
    startMarker: '  // Pie Chart Component for Area Groups - Updated to use percentages',
    endMarker: '  // Instant Occupancy Count Chart Component',
    importMarker: "import SpaceLineChartAdapter from '../../../../shared/dashboard/charts/space/SpaceLineChartAdapter'",
  },
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'advanced', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'space-stacked-bar-advanced.jsx'),
    startMarker: '  // Pie Chart Component for Area Groups - Updated to use percentages',
    endMarker: '  // Instant Occupancy Count Chart Component',
    importMarker: "import SpaceLineChartAdapter from '../../../../shared/dashboard/charts/space/SpaceLineChartAdapter'",
  },
  {
    file: path.join(__dirname, '..', 'src', 'variants', 'customized', 'screens', 'dashboard', 'SpaceUtilization.jsx'),
    fragment: path.join(__dirname, 'fragments', 'space-stacked-bar-customized.jsx'),
    startMarker: '  // Pie Chart Component for Area Groups - Updated to use percentages',
    endMarker: '  // Fullscreen flags for builtin widgets (used inside chart renderers)',
    importMarker: "import SpaceLineChartAdapter from '../../../../shared/dashboard/charts/space/SpaceLineChartAdapter'",
  },
];

function spliceVariant({ file, fragment, startMarker, endMarker, importMarker }) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes(IMPORT_LINE)) {
    if (!content.includes(importMarker)) {
      throw new Error(`import marker missing in ${file}`);
    }
    content = content.replace(importMarker, `${importMarker}\n${IMPORT_LINE}`);
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
