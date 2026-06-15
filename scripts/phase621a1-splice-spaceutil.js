#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function spliceSpaceUtil(rel) {
  const filePath = path.join(ROOT, rel);
  let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  const procStart = lines.findIndex((l) => l.trim() === '// Process data based on selected duration');
  const procEnd = lines.findIndex((l, i) => i > procStart && l.includes('// Always show the chart with the data received from backend'));

  if (procStart < 0 || procEnd < 0) {
    console.warn('skip occupancy block', rel, procStart, procEnd);
  } else if (lines.slice(procStart, procStart + 3).some((l) => l.includes('spaceOccupancyToRecharts'))) {
    console.log('occupancy already wired', rel);
  } else {
    const replacement = [
      '      // Process data based on selected duration (shared transform)',
      '      let processedChartData = spaceOccupancyToRecharts(chartData, {',
      '        selectedDuration,',
      '        currentDate,',
      '        customDateRange,',
      '      });',
      '',
    ];
    lines = [...lines.slice(0, procStart), ...replacement, ...lines.slice(procEnd)];
  }

  // Line chart formatXAxisLabel (occupancy - checks value !== 0)
  if (!lines.some((l) => l.includes('formatSpaceOccupancyXAxisLabel(value'))) {
  const occAxisStart = lines.findIndex((l, i) => l.includes('const formatXAxisLabel = useCallback((value) =>') && (lines[i + 1] || '').includes('!value && value !== 0'));
  if (occAxisStart >= 0) {
    let occAxisEnd = occAxisStart;
    for (let i = occAxisStart; i < lines.length; i++) {
      if (lines[i].includes('}, [selectedDuration, currentDate, currentYear, customDateRange]);')) {
        occAxisEnd = i;
        break;
      }
    }
    const axisReplacement = [
      '      const formatXAxisLabel = useCallback(',
      '        (value) =>',
      '          formatSpaceOccupancyXAxisLabel(value, {',
      '            selectedDuration,',
      '            currentDate,',
      '            currentYear,',
      '            customDateRange,',
      '          }),',
      '        [selectedDuration, currentDate, currentYear, customDateRange]',
      '      );',
    ];
    lines = [...lines.slice(0, occAxisStart), ...axisReplacement, ...lines.slice(occAxisEnd + 1)];
  }
  }

  // Instant formatXAxisLabel (checks !value only)
  if (!lines.some((l) => l.includes('formatSpaceInstantOccupancyXAxisLabel(value'))) {
  const instAxisStart = lines.findIndex((l, i) => {
    if (!l.includes('const formatXAxisLabel = useCallback((value) =>')) return false;
    const next = lines[i + 1] || '';
    return next.includes('if (!value) {') && !next.includes('!== 0');
  });
  if (instAxisStart >= 0) {
    let instAxisEnd = instAxisStart;
    for (let i = instAxisStart; i < lines.length; i++) {
      if (lines[i].includes('}, [selectedDuration, currentDate, currentYear, customDateRange]);')) {
        instAxisEnd = i;
        break;
      }
    }
    const axisReplacement = [
      '      const formatXAxisLabel = useCallback(',
      '        (value) =>',
      '          formatSpaceInstantOccupancyXAxisLabel(value, {',
      '            selectedDuration,',
      '            currentDate,',
      '            currentYear,',
      '            customDateRange,',
      '          }),',
      '        [selectedDuration, currentDate, currentYear, customDateRange]',
      '      );',
    ];
    lines = [...lines.slice(0, instAxisStart), ...axisReplacement, ...lines.slice(instAxisEnd + 1)];
  }
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('spliced', rel);
}

['basic', 'advanced', 'customized'].forEach((v) => {
  spliceSpaceUtil(`src/variants/${v}/screens/dashboard/SpaceUtilization.jsx`);
});
