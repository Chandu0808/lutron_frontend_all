/**
 * Splice shared SavingsStrategyChart adapter into variant Dashboard.jsx files.
 */
const fs = require('fs');
const path = require('path');

const IMPORT_LINE =
  "import SavingsStrategyChartAdapter, { savingsStrategyChartPropsAreEqual } from '../../../../shared/dashboard/charts/savings/SavingsStrategyChartAdapter'";

const VARIANTS = [
  {
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'advanced', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'savings-strategy-chart-advanced.jsx'),
  },
  {
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'customized', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'savings-strategy-chart-customized.jsx'),
  },
  {
    dashboard: path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'Dashboard.jsx'),
    fragment: path.join(__dirname, 'fragments', 'savings-strategy-chart-basic.jsx'),
  },
];

function splice(dashboardPath, fragmentPath) {
  let content = fs.readFileSync(dashboardPath, 'utf8');
  const marker = "import { useAreaTreeSelection } from '../../../../shared/dashboard/hooks/useAreaTreeSelection'";
  if (!content.includes(marker)) throw new Error(`import marker missing in ${dashboardPath}`);
  if (!content.includes(IMPORT_LINE)) {
    content = content.replace(marker, `${marker}\n${IMPORT_LINE}`);
  }

  const startMarker = '  // Add Savings Strategy Chart component';
  const endMarker = '  // Add the missing renderLightingPowerDensity function';
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
  splice(v.dashboard, v.fragment);
}

console.log('done');
