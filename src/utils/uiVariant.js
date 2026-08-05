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

/**
 * Best-effort sync of selected UI variant into installation_settings.ui_variant.
 * Theme APIs also pass ?variant= from localStorage; this keeps other
 * variant-scoped backend routes aligned after a switch.
 *
 * Never throws — returns false on timeout/network/auth failure so the UI
 * can still reload.
 */
export async function syncUiVariantToBackend(variant, options = {}) {
  if (!UI_VARIANTS.includes(variant)) return false;
  const apiUrl =
    options.apiUrl ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:8000";
  const token =
    options.token !== undefined
      ? options.token
      : (() => {
          try {
            return localStorage.getItem("lutron");
          } catch {
            return null;
          }
        })();
  if (!token) return false;
  const timeoutMs = options.timeoutMs ?? 3000;
  const fetchImpl = options.fetchImpl || fetch;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${String(apiUrl).replace(/\/$/, "")}/installation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ui_variant: variant }),
        signal: controller.signal,
      });
      return Boolean(response && response.ok);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
