/** UI experience variant: basic (default), advanced, or customized. */
export const UI_VARIANT_STORAGE_KEY = 'lutron_ui_variant';

export const UI_VARIANTS = ['basic', 'advanced', 'customized'];

/** First run and invalid/missing values default to basic. */
export function getUiVariant() {
  try {
    const raw = localStorage.getItem(UI_VARIANT_STORAGE_KEY);
    if (raw && UI_VARIANTS.includes(raw)) return raw;
  } catch {
    /* private mode / blocked storage */
  }
  return 'basic';
}

export function setUiVariant(variant) {
  if (!UI_VARIANTS.includes(variant)) return;
  try {
    localStorage.setItem(UI_VARIANT_STORAGE_KEY, variant);
  } catch {
    /* ignore */
  }
}

export const UI_VARIANT_LABELS = {
  basic: 'Basic',
  advanced: 'Advanced',
  customized: 'Customized',
};

/** Superadmin only — matches JWT/localStorage role variants (Superadmin, Super Admin, etc.). */
export function isSuperAdminRole(role) {
  if (role == null || role === '') return false;
  const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '');
  return normalized === 'superadmin';
}

/** Snapshot before `localStorage.clear()` on logout (same pattern as widget visibility). */
export function readUiVariantRaw() {
  try {
    return localStorage.getItem(UI_VARIANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function restoreUiVariantAfterStorageClear(raw) {
  if (raw == null || !UI_VARIANTS.includes(raw)) return;
  try {
    localStorage.setItem(UI_VARIANT_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
}
