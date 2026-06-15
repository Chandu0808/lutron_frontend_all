/**
 * Energy chart API payload → Recharts row data.
 * Unified basic/advanced/customized logic via options bag.
 */

function findAreaName(nodes, targetId) {
  if (!nodes) return `Area ${targetId}`;
  for (const node of nodes) {
    if (node.area_id === targetId) {
      return node.name || node.area_name || `Area ${targetId}`;
    }
    if (node.children) {
      const found = findAreaName(node.children, targetId);
      if (found) return found;
    }
    if (node.areas) {
      const found = findAreaName(node.areas, targetId);
      if (found) return found;
    }
  }
  return `Area ${targetId}`;
}

function resolveEffectiveScope(options = {}) {
  const {
    selectedAreas = [],
    selectedFloorIds = [],
    selectedGroupIds = [],
    widgetAreaIds = null,
    widgetFloorIds = null,
    widgetGroupIds = null,
  } = options;

  const hasGlobalFloorSelection = selectedFloorIds.length > 0;
  const hasGlobalAreaSelection = selectedAreas.length > 0;
  const hasGlobalGroupSelection = selectedGroupIds.length > 0;
  const hasAnyGlobalSelection =
    hasGlobalFloorSelection || hasGlobalAreaSelection || hasGlobalGroupSelection;

  return {
    effectiveFloorIds: hasGlobalFloorSelection
      ? selectedFloorIds
      : Array.isArray(widgetFloorIds) && !hasAnyGlobalSelection
        ? widgetFloorIds
        : selectedFloorIds,
    effectiveAreaIds: hasGlobalAreaSelection
      ? selectedAreas
      : Array.isArray(widgetAreaIds) && !hasAnyGlobalSelection
        ? widgetAreaIds
        : selectedAreas,
    effectiveGroupIds: hasGlobalGroupSelection
      ? selectedGroupIds
      : Array.isArray(widgetGroupIds) && !hasAnyGlobalSelection
        ? widgetGroupIds
        : selectedGroupIds,
  };
}

function applyBasicCombinedAreasSplit(yAxis, options) {
  const { selectedAreas = [], areaTree } = options;
  if (!(selectedAreas.length < 5 && selectedAreas.length > 0 && yAxis['Combined Areas'])) {
    return yAxis;
  }

  const areaNames = selectedAreas.map((areaId) => {
    if (areaTree && (areaTree.tree || areaTree.areas)) {
      const nodes = areaTree.tree || areaTree.areas;
      return findAreaName(nodes, areaId);
    }
    return `Area ${areaId}`;
  });

  const combinedValues = yAxis['Combined Areas'];
  const newYAxis = {};
  areaNames.forEach((areaName) => {
    newYAxis[areaName] = combinedValues;
  });
  return newYAxis;
}

function applyCustomizedCombinedAreasSplit(yAxis, options) {
  const {
    forceIndividualAreas = false,
    areaTree,
    areaGroups,
    floors = [],
  } = options;
  const { effectiveFloorIds, effectiveAreaIds, effectiveGroupIds } = resolveEffectiveScope(options);
  let nextYAxis = { ...yAxis };

  if (
    nextYAxis['Combined Areas'] &&
    ((effectiveAreaIds.length > 0 && (forceIndividualAreas || effectiveAreaIds.length < 5)) ||
      (effectiveAreaIds.length === 0 && effectiveGroupIds.length === 0))
  ) {
    const entitiesToDisplay =
      effectiveAreaIds.length > 0
        ? effectiveAreaIds.map((areaId) => {
            const nodes =
              areaTree && (areaTree.tree || areaTree.areas) ? areaTree.tree || areaTree.areas : [];
            return findAreaName(nodes, areaId);
          })
        : (effectiveFloorIds.length > 0 ? floors.filter((f) => effectiveFloorIds.includes(f.id)) : floors).map(
            (f) => f.floor_name || f.name || `Floor ${f.id}`
          );

    const combinedValues = nextYAxis['Combined Areas'];
    const splitYAxis = {};
    entitiesToDisplay.forEach((entityName) => {
      splitYAxis[entityName] = combinedValues;
    });
    nextYAxis = splitYAxis;
  }

  if (
    effectiveGroupIds &&
    effectiveGroupIds.length > 0 &&
    nextYAxis['Combined Areas'] &&
    areaGroups
  ) {
    const allGroups = [
      ...(areaGroups.user_area_groups || []),
      ...(areaGroups.special_area_groups || []),
    ];
    const groupLabels = effectiveGroupIds.map((gid) => {
      const match = allGroups.find(
        (g) => g && (String(g.group_id) === String(gid) || String(g.id) === String(gid))
      );
      return match ? String(match.name || match.group_name || gid).trim() : String(gid);
    });
    const combinedGroupValues = nextYAxis['Combined Areas'];
    const groupYAxis = {};
    groupLabels.forEach((label) => {
      groupYAxis[label] = combinedGroupValues;
    });
    Object.keys(nextYAxis).forEach((k) => {
      if (k !== 'Combined Areas') groupYAxis[k] = nextYAxis[k];
    });
    nextYAxis = groupYAxis;
  }

  if (
    effectiveFloorIds &&
    effectiveFloorIds.length > 0 &&
    (!effectiveGroupIds || effectiveGroupIds.length === 0) &&
    nextYAxis['Combined Areas'] &&
    floors
  ) {
    const floorLabels = effectiveFloorIds.map((fid) => {
      const match = floors.find((f) => f && Number(f.id) === Number(fid));
      return match ? String(match.floor_name || match.name || fid).trim() : `Floor ${fid}`;
    });
    const combinedFloorValues = nextYAxis['Combined Areas'];
    const floorYAxis = {};
    floorLabels.forEach((label) => {
      floorYAxis[label] = combinedFloorValues;
    });
    Object.keys(nextYAxis).forEach((k) => {
      if (k !== 'Combined Areas') floorYAxis[k] = nextYAxis[k];
    });
    nextYAxis = floorYAxis;
  }

  return nextYAxis;
}

function applyDurationAxisFixes(xAxis, yAxis, selectedDuration) {
  let nextX = xAxis;
  let nextY = yAxis;

  if (selectedDuration === 'this-week') {
    if (nextX.length === 29 && nextX[0] === 'Sun 0' && nextX[28] === 'Sun 0') {
      nextX = nextX.slice(0, 28);
      const newYAxis = {};
      Object.keys(nextY).forEach((key) => {
        if (nextY[key].length === 29) {
          newYAxis[key] = nextY[key].slice(0, 28);
        } else {
          newYAxis[key] = nextY[key];
        }
      });
      nextY = newYAxis;
    }
  }

  if (selectedDuration === 'this-month' && nextX.length === 24 && nextX[0] === '00:00') {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dailyLabels = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dailyLabels.push(`${day}/${month + 1}`);
    }

    const newYAxis = {};
    Object.keys(nextY).forEach((key) => {
      const hourlyValues = nextY[key];
      const dailyValues = [];
      for (let day = 0; day < daysInMonth; day++) {
        const hourIndex = day % 24;
        const hourValue = hourlyValues[hourIndex];
        dailyValues.push(hourValue !== undefined ? hourValue : null);
      }
      newYAxis[key] = dailyValues;
    });

    nextX = dailyLabels;
    nextY = newYAxis;
  }

  return { xAxis: nextX, yAxis: nextY };
}

function rowsFromAxes(xAxis, yAxis) {
  return xAxis.map((label, index) => {
    const dataPoint = { date: label };
    if (yAxis && typeof yAxis === 'object') {
      Object.keys(yAxis).forEach((key) => {
        let value = yAxis[key][index];
        if (value === undefined) {
          value = null;
        }
        dataPoint[key] = value;
      });
    }
    return dataPoint;
  });
}

/**
 * @param {object} data API chart payload
 * @param {string} chartType 'consumption' | 'other' (unused in transform; preserved for callers)
 * @param {object} options Scope + duration context from dashboard state
 */
export function transformDataForCharts(data, chartType = 'consumption', options = {}) {
  if (!data || !data['x-axis'] || !data['y-axis']) {
    return [];
  }

  let xAxis = data['x-axis'] || data.x_axis || [];
  let yAxis = data['y-axis'] || data.y_axis || {};

  if (!xAxis || !yAxis || !Array.isArray(xAxis) || typeof yAxis !== 'object') {
    return [];
  }
  if (xAxis.length === 0 || Object.keys(yAxis).length === 0) {
    return [];
  }

  const useCustomizedScope =
    options.forceIndividualAreas !== undefined ||
    options.widgetFloorIds !== undefined ||
    options.widgetAreaIds !== undefined ||
    options.widgetGroupIds !== undefined ||
    (options.selectedFloorIds && options.selectedFloorIds.length > 0) ||
    (options.selectedGroupIds && options.selectedGroupIds.length > 0) ||
    options.areaGroups;

  if (useCustomizedScope) {
    yAxis = applyCustomizedCombinedAreasSplit(yAxis, options);
  } else {
    yAxis = applyBasicCombinedAreasSplit(yAxis, options);
  }

  const fixed = applyDurationAxisFixes(xAxis, yAxis, options.selectedDuration);
  return rowsFromAxes(fixed.xAxis, fixed.yAxis);
}
