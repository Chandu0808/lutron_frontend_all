/** LocalStorage keys for Dashboard Overview External Link tile settings. */
export const SHADES_HYPERLINK_KEY = 'lutron_dashboard_shades_hyperlink';
export const SHADES_NAME_KEY = 'lutron_dashboard_shades_name';
export const SHADES_CO2_CONSTANT_KEY = 'lutron_dashboard_shades_co2_constant';
export const SHADES_IMAGE_KEY = 'lutron_dashboard_shades_image';
export const SHADES_DESCRIPTION_KEY = 'lutron_dashboard_shades_description';
export const SHADES_SETTINGS_EVENT = 'lutron-dashboard-shades-settings-changed';

export const DEFAULT_SHADES_WIDGET_NAME = 'External Link';
export const DEFAULT_SHADES_CO2_CONSTANT = 0.82;

export const getShadesCo2Constant = () => {
  try {
    const raw = localStorage.getItem(SHADES_CO2_CONSTANT_KEY);
    if (raw == null || raw === '') return DEFAULT_SHADES_CO2_CONSTANT;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SHADES_CO2_CONSTANT;
  } catch {
    return DEFAULT_SHADES_CO2_CONSTANT;
  }
};

export const getShadesWidgetName = () => {
  try {
    const saved = localStorage.getItem(SHADES_NAME_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    /* ignore */
  }
  return DEFAULT_SHADES_WIDGET_NAME;
};

export const getShadesWidgetImage = () => {
  try {
    const saved = localStorage.getItem(SHADES_IMAGE_KEY);
    return saved && saved.trim() ? saved.trim() : '';
  } catch {
    return '';
  }
};

export const getShadesWidgetDescription = () => {
  try {
    const saved = localStorage.getItem(SHADES_DESCRIPTION_KEY);
    return saved && saved.trim() ? saved.trim() : '';
  } catch {
    return '';
  }
};

export const notifyShadesSettingsChanged = () => {
  try {
    window.dispatchEvent(new CustomEvent(SHADES_SETTINGS_EVENT));
  } catch {
    /* ignore */
  }
};

/** @param {File} file @param {number} maxBytes */
export function readImageFileAsDataUrl(file, maxBytes = 400_000) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error('Image must be 400 KB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}
