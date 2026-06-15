export const ACTION_SOURCE = {
  INDIVIDUAL: 'individual',
  COMMON: 'common',
};

export function tagLoadedActions(actions) {
  return (actions || []).map((action) => ({
    ...action,
    source: action.source || ACTION_SOURCE.INDIVIDUAL,
  }));
}

export function tagAreasWithLoadedActions(areas) {
  return (areas || []).map((area) => ({
    ...area,
    actions: tagLoadedActions(area.actions),
  }));
}

export function withIndividualSource(action) {
  return { ...action, source: ACTION_SOURCE.INDIVIDUAL };
}

export function withCommonSource(action) {
  return { ...action, source: ACTION_SOURCE.COMMON };
}

export function stripActionSource(action) {
  if (!action || typeof action !== 'object') return action;
  const { source, ...rest } = action;
  return rest;
}

/**
 * Merge a common action into a location's actions without overwriting individual
 * actions of the same type.
 */
export function applyCommonActionToActions(existingActions, commonAction) {
  const taggedCommon = withCommonSource(commonAction);
  const commonType = commonAction.type;
  const existing = existingActions || [];

  const withoutOldCommonOfType = existing.filter(
    (action) => !(action.source === ACTION_SOURCE.COMMON && action.type === commonType)
  );

  const hasIndividualOfType = withoutOldCommonOfType.some(
    (action) =>
      (action.source || ACTION_SOURCE.INDIVIDUAL) === ACTION_SOURCE.INDIVIDUAL &&
      action.type === commonType
  );

  if (hasIndividualOfType) {
    return withoutOldCommonOfType;
  }

  return [...withoutOldCommonOfType, taggedCommon];
}
