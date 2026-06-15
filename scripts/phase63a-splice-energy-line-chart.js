/**
 * Splice shared EnergyLineChart adapter into variant Dashboard.jsx files.
 */
const fs = require('fs');
const path = require('path');

const IMPORT_LINE =
  "import EnergyLineChartAdapter, { energyLineChartPropsAreEqual } from '../../../../shared/dashboard/charts/views/EnergyLineChartAdapter'";

const VARIANTS = [
  {
    variant: 'advanced',
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'advanced', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'energy-line-chart-advanced.jsx'),
  },
  {
    variant: 'customized',
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'customized', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'energy-line-chart-customized.jsx'),
  },
  {
    variant: 'basic',
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'energy-line-chart-basic.jsx'),
  },
];

function spliceEnergyLineChart(dashboardPath, fragmentPath) {
  let content = fs.readFileSync(dashboardPath, 'utf8');
  if (!content.includes(IMPORT_LINE)) {
    const marker = "import { useAreaTreeSelection } from '../../../../shared/dashboard/hooks/useAreaTreeSelection'";
    if (!content.includes(marker)) throw new Error(`import marker missing in ${dashboardPath}`);
    content = content.replace(marker, `${marker}\n${IMPORT_LINE}`);
  }

  const startMarker = '  // Update the EnergyLineChart component to handle combined areas';
  const endMarker = '  // Handle export actions - DISABLED';
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
  if (!fs.existsSync(v.fragment)) {
    console.log('skip', v.variant, '- fragment pending');
    continue;
  }
  spliceEnergyLineChart(v.dashboard, v.fragment);
}

console.log('done');
