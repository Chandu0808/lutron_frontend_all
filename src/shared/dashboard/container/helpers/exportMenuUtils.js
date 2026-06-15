export function createAdvancedExportOutsideClickProfile(chartExportDropdownClass) {
  return {
    buttonSelector: '[data-chart-export="true"]',
    panelSelectors: [`.${chartExportDropdownClass}`, '.alerts-export-dropdown'],
  };
}

export const EXPORT_MENU_OUTSIDE_CLICK_PROFILES = {
  basic: {
    buttonSelector: 'button[data-export-menu="true"]',
    panelSelector: '[data-export-dropdown-panel]',
  },
  advanced: {
    buttonSelector: '[data-chart-export="true"]',
    panelSelector: null,
    panelSelectors: ['.chart-export-dropdown', '.alerts-export-dropdown'],
  },
  customizedLegacy: {
    variant: 'customized-legacy',
  },
};

export function closeAllExportMenus() {
  return {};
}

export function toggleExportMenuState(previousState, menuKey) {
  const prev = previousState && typeof previousState === 'object' ? previousState : {};
  return {
    ...prev,
    [menuKey]: !prev[menuKey],
  };
}

export function setExportMenuOpen(previousState, menuKey, isOpen) {
  const prev = previousState && typeof previousState === 'object' ? previousState : {};
  return {
    ...prev,
    [menuKey]: Boolean(isOpen),
  };
}

function isCustomizedLegacyExportTarget(event) {
  const exportButton = event.target.closest('button');
  const isExportButton =
    exportButton &&
    exportButton.textContent.includes('<FileUploadIcon fontSize="small" /> Export');

  const positioned = event.target.closest('div[style*="position: absolute"]');
  const isInsideDropdown =
    positioned &&
    (positioned.style.backgroundColor === 'rgb(205, 192, 160)' ||
      positioned.style.backgroundColor === '#CDC0A0');

  return Boolean(isExportButton || isInsideDropdown);
}

export function shouldCloseExportMenusOnOutsideClick(event, profile = EXPORT_MENU_OUTSIDE_CLICK_PROFILES.basic) {
  if (!event || !profile) return false;

  if (profile.variant === 'customized-legacy') {
    return !isCustomizedLegacyExportTarget(event);
  }

  const isExportButton = profile.buttonSelector
    ? Boolean(event.target.closest(profile.buttonSelector))
    : false;

  let isInsideDropdown = false;
  if (profile.panelSelector) {
    isInsideDropdown = Boolean(event.target.closest(profile.panelSelector));
  } else if (Array.isArray(profile.panelSelectors)) {
    isInsideDropdown = profile.panelSelectors.some((selector) =>
      Boolean(event.target.closest(selector))
    );
  }

  return !isExportButton && !isInsideDropdown;
}

export function createExportMenuOutsideClickHandler(onCloseAll, profile = EXPORT_MENU_OUTSIDE_CLICK_PROFILES.basic) {
  return (event) => {
    if (shouldCloseExportMenusOnOutsideClick(event, profile)) {
      onCloseAll();
    }
  };
}
