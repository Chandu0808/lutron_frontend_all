#!/usr/bin/env node
/**
 * Phase 6.1A — wire shared dashboard infrastructure into variant screens/slices
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

const SHARED_IMPORTS = `import {
  formatDateForState,
  parseDateFromState,
  calculateDashboardDateParameters,
} from '../../../../shared/dashboard/utils/dashboardDateState'
import { useDashboardDateRange } from '../../../../shared/dashboard/hooks/useDashboardDateRange'
import { useDashboardApiParams } from '../../../../shared/dashboard/hooks/useDashboardApiParams'
import { useAreaTreeSelection } from '../../../../shared/dashboard/hooks/useAreaTreeSelection'
`;

function stripLocalDateHelpers(content) {
  return content
    .replace(
      /const formatDateForState = \(dateInput\) => \{[\s\S]*?\};\r?\n\r?\nconst MONTH_NAME_TO_INDEX/,
      `${SHARED_IMPORTS}\nconst MONTH_NAME_TO_INDEX`
    )
    .replace(/const parseDateFromState = \(value\) => \{[\s\S]*?\};\r?\n\r?\n(function Dashboard|const SpaceUtilization)/, '$1');
}

function injectDashboardHooks(content) {
  const hookBlock = `
  const { dateParams, getCurrentDateParameters, stableDateRef } = useDashboardDateRange({
    selectedDuration,
    customDateRange,
    isNavigating,
    currentDate,
    currentYear,
  });

  const calculateDateParameters = () =>
    calculateDashboardDateParameters({
      selectedDuration,
      customDateRange,
      isNavigating,
      currentDate,
      currentYear,
      stableDate: stableDateRef.current,
    });

  const calculateCurrentDateParameters = getCurrentDateParameters;

  const { apiParams, apiParamsString } = useDashboardApiParams({
    selectedDuration,
    customDateRange,
    customStartDate,
    customEndDate,
    selectedAreas,
    selectedFloorIds,
    allAreasLoaded,
    dateParams,
    isNavigating,
  });
`;

  if (content.includes('useDashboardDateRange')) return content;

  const anchor = content.match(
    /\/\/ Energy Custom Period:[\s\S]*?const energyCustomNeedsDates[\s\S]*?;\r?\n\r?\n/
  );
  if (anchor) {
    return content.replace(anchor[0], anchor[0] + hookBlock);
  }

  const anchor2 = content.match(
    /const customEndDate = useSelector\(\(state\) => state\.dashboard\.customEndDate\)[^;]*;\r?\n\r?\n/
  );
  if (anchor2) {
    return content.replace(anchor2[0], anchor2[0] + hookBlock);
  }
  return content;
}

function removeDuplicateDateApiBlock(content) {
  const lines = content.split(/\r?\n/);
  const hookLine = lines.findIndex((l) => l.includes('useDashboardApiParams'));
  if (hookLine < 0) return content;
  const abortStart = lines.findIndex((l) => l.includes('// Add request cancellation to prevent race conditions'));
  const apiStrStart = lines.findIndex((l, i) => i > abortStart && l.includes('const apiParamsString = useMemo'));
  const apiStrEnd = lines.findIndex((l, i) => i > apiStrStart && l.trim() === '}, [apiParams]);');
  if (abortStart < 0 || apiStrStart < 0 || apiStrEnd < 0) return content;

  const calcStart = lines.findIndex(
    (l, i) => i > hookLine && (l.includes('const stableDateRef = useRef') || l.includes('const calculateDateParameters'))
  );
  if (calcStart < 0 || calcStart >= abortStart) {
    const newLines = [...lines.slice(0, hookLine + 15), ...lines.slice(abortStart, apiStrStart), ...lines.slice(apiStrEnd + 1)];
    return newLines.join('\n');
  }
  const newLines = [...lines.slice(0, calcStart), ...lines.slice(abortStart, apiStrStart), ...lines.slice(apiStrEnd + 1)];
  return newLines.join('\n');
}

function replaceAreaTreeState(content) {
  const old = `  // State to track which floors have areas selected (for checkbox display)
  const [floorsWithSelectedAreas, setFloorsWithSelectedAreas] = useState(new Set())

  // State to track which specific floors are selected (for floor-level selection) - CHANGED TO ARRAY
  const [localSelectedFloorIds, setLocalSelectedFloorIds] = useState([]);

  // Local state to track selected areas before Set button is clicked
  const [localSelectedAreas, setLocalSelectedAreas] = useState([]);

  // Local state to track selected groups before Set button is clicked
  const [localSelectedGroups, setLocalSelectedGroups] = useState([]);

  // Separate state for floor expansion (independent of floor selection)
  const [expandedFloorId, setExpandedFloorId] = useState(null);`;

  const neu = `  const {
    floorsWithSelectedAreas,
    setFloorsWithSelectedAreas,
    localSelectedFloorIds,
    setLocalSelectedFloorIds,
    localSelectedAreas,
    setLocalSelectedAreas,
    localSelectedGroups,
    setLocalSelectedGroups,
    expandedFloorId,
    setExpandedFloorId,
  } = useAreaTreeSelection();`;

  if (!content.includes(old)) return content;
  content = content.replace(old, neu);
  content = content.replace(
    /  \/\/ Update floorsWithSelectedAreas when localSelectedFloorIds changes\r?\n  useEffect\(\(\) => \{[\s\S]*?\}, \[localSelectedFloorIds\]\);\r?\n/,
    ''
  );
  return content;
}

function wireSpaceUtilization(rel) {
  let c = read(rel);
  if (c.includes('shared/dashboard/utils/dashboardDateState')) return;
  c = c.replace(
    /const formatDateForState = \(dateInput\) => \{[\s\S]*?\};\r?\n\r?\nconst MONTH_NAME_TO_INDEX/,
    `import { formatDateForState, parseDateFromState } from '../../../../shared/dashboard/utils/dashboardDateState'\n\nconst MONTH_NAME_TO_INDEX`
  );
  c = c.replace(/const parseDateFromState = \(value\) => \{[\s\S]*?\};\r?\n\r?\n/, '');
  write(rel, c);
  console.log('wired SpaceUtilization', rel);
}

function wireDashboardSlice(rel) {
  let c = read(rel);
  if (c.includes('shared/dashboard/utils/mapTimeRangeToBackend')) return;
  c = c.replace(
    /\/\/ Add this helper at the top of your file:\r?\nconst mapTimeRangeToBackend = \(timeRange\) => \{[\s\S]*?\};\r?\n\r?\n\/\/ Specific mapping for savings strategy endpoint\r?\nconst mapTimeRangeToBackendForSavings = \(timeRange\) => \{[\s\S]*?\};\r?\n\r?\n/,
    `import { mapTimeRangeToBackend, mapTimeRangeToBackendForSavings } from '../../../../../shared/dashboard/utils/mapTimeRangeToBackend';\n\n`
  );
  write(rel, c);
  console.log('wired slice', rel);
}

function stripStandaloneParseDateFromState(content) {
  return content.replace(
    /const parseDateFromState = \(value\) => \{[\s\S]*?\};\r?\n\r?\n(function SortableDashboardItem|function Dashboard|const SpaceUtilization)/,
    '$1'
  );
}

function wireDashboard(rel) {
  let c = read(rel);
  c = stripLocalDateHelpers(c);
  c = stripStandaloneParseDateFromState(c);
  c = replaceAreaTreeState(c);
  c = injectDashboardHooks(c);
  if (!c.includes('useDashboardApiParams({')) {
    throw new Error(`hook injection failed for ${rel}`);
  }
  c = removeDuplicateDateApiBlock(c);
  write(rel, c);
  console.log('wired Dashboard', rel);
}

['basic', 'advanced', 'customized'].forEach((v) => {
  wireDashboard(`src/variants/${v}/screens/dashboard/Dashboard.jsx`);
  wireDashboardSlice(`src/variants/${v}/redux/slice/dashboard/dashboardSlice.js`);
  wireSpaceUtilization(`src/variants/${v}/screens/dashboard/SpaceUtilization.jsx`);
});

// customized buildDashboardChartQueryParams
const qpath = 'src/variants/customized/utils/buildDashboardChartQueryParams.js';
let qc = read(qpath);
if (!qc.includes('shared/dashboard/utils/buildDashboardApiParams')) {
  qc = `export {
  buildDashboardChartAxiosParams,
  pickEnergyBucketTimeParams,
} from '../../../shared/dashboard/utils/buildDashboardApiParams';
export { mapTimeRangeToBackend } from '../../../shared/dashboard/utils/mapTimeRangeToBackend';
`;
  write(qpath, qc);
  console.log('wired buildDashboardChartQueryParams');
}

// unified energy slice
['basic', 'advanced', 'customized'].forEach((v) => {
  const u = `src/variants/${v}/redux/slice/dashboard/unifiedEnergySlice.js`;
  let uc = read(u);
  if (uc.includes('shared/dashboard/utils/mapTimeRangeToBackend')) return;
  uc = uc.replace(
    /const mapTimeRangeToBackend = \(timeRange\) => \{[\s\S]*?\};\r?\n\r?\n/,
    `import { mapTimeRangeToBackend } from '../../../../../shared/dashboard/utils/mapTimeRangeToBackend';\n\n`
  );
  write(u, uc);
  console.log('wired unifiedEnergySlice', v);
});

console.log('done');
