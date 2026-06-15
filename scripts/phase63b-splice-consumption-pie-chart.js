/**
 * Splice shared ConsumptionPieChart adapter into variant Dashboard.jsx files.
 */
const fs = require('fs');
const path = require('path');

const IMPORT_LINES = [
  "import ConsumptionPieChartAdapter, { consumptionPieChartPropsAreEqual } from '../../../../shared/dashboard/charts/views/ConsumptionPieChartAdapter'",
];

const BASIC_EXTRA_IMPORT =
  "import { resolvePieChartTheme } from '../../../../shared/dashboard/charts/themes/pieChartTheme'";

const VARIANTS = [
  {
    variant: 'advanced',
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'advanced', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'consumption-pie-chart-advanced.jsx'),
    extraImports: [],
  },
  {
    variant: 'customized',
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'customized', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'consumption-pie-chart-customized.jsx'),
    extraImports: [],
  },
  {
    variant: 'basic',
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'consumption-pie-chart-basic.jsx'),
    extraImports: [BASIC_EXTRA_IMPORT],
  },
];

function spliceConsumptionPieChart(dashboardPath, fragmentPath, extraImports) {
  let content = fs.readFileSync(dashboardPath, 'utf8');
  const marker = "import { useAreaTreeSelection } from '../../../../shared/dashboard/hooks/useAreaTreeSelection'";
  if (!content.includes(marker)) throw new Error(`import marker missing in ${dashboardPath}`);

  const importsToAdd = [...IMPORT_LINES, ...extraImports].filter((line) => !content.includes(line));
  if (importsToAdd.length > 0) {
    content = content.replace(marker, `${marker}\n${importsToAdd.join('\n')}`);
  }

  const startMarker = '  // Update the ConsumptionPieChart component to maintain same height';
  const endMarker = '  // Add Savings Strategy Chart component';
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`markers not found in ${dashboardPath}`);
  }

  const fragment = fs.readFileSync(fragmentPath, 'utf8');
  content = content.slice(0, start) + fragment + content.slice(end);
  fs.writeFileSync(dashboardPath, content);
  console.log('spliced', dashboardPath);
}

for (const v of VARIANTS) {
  spliceConsumptionPieChart(v.dashboard, v.fragment, v.extraImports);
}

console.log('done');
