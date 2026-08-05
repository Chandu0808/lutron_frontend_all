/**
 * Coalesce identical dashboard chart GETs that fire from Dashboard thunks and
 * SpaceUtilization / custom-graph loaders at the same time.
 * In-flight join + short recent cache (Strict Mode / remount races).
 * Filter changes use a different key, so they are not served from cache.
 */
const inflight = new Map();
/** @type {Map<string, { promise: Promise<any>, expires: number }>} */
const recent = new Map();
const RECENT_TTL_MS = 2500;
const IGNORE_QUERY_KEYS = new Set(['_', 'cacheBust', 'cache_bust']);

function normalizePath(urlOrPath) {
  const raw = String(urlOrPath || '').trim();
  if (!raw) return '';
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      return u.pathname.replace(/\/+$/, '') || '/';
    }
  } catch {
    /* fall through */
  }
  const noHash = raw.split('#')[0];
  const pathOnly = noHash.split('?')[0];
  return pathOnly.replace(/\/+$/, '') || '/';
}

function paramsFromUrl(urlOrPath) {
  const raw = String(urlOrPath || '');
  const q = raw.indexOf('?');
  if (q < 0) return new URLSearchParams();
  return new URLSearchParams(raw.slice(q + 1));
}

function mergeParams(urlOrPath, configParams) {
  const merged = paramsFromUrl(urlOrPath);
  if (!configParams) return merged;

  if (configParams instanceof URLSearchParams) {
    configParams.forEach((value, key) => {
      merged.append(key, value);
    });
    return merged;
  }

  if (typeof configParams === 'object') {
    Object.entries(configParams).forEach(([key, val]) => {
      if (val === null || val === undefined) return;
      if (Array.isArray(val)) {
        val.forEach((v) => {
          if (v !== null && v !== undefined) merged.append(key, String(v));
        });
      } else {
        merged.append(key, String(val));
      }
    });
  }
  return merged;
}

function stableQueryKey(params) {
  const entries = [...params.entries()]
    .filter(([k]) => !IGNORE_QUERY_KEYS.has(String(k)))
    .map(([k, v]) => [String(k), String(v)]);
  entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export function buildDashboardGetCoalesceKey(urlOrPath, config = {}) {
  const path = normalizePath(urlOrPath);
  const query = stableQueryKey(mergeParams(urlOrPath, config?.params));
  return `${path}?${query}`;
}

/**
 * @param {import('axios').AxiosInstance|{ get: Function }} client
 * @param {string} urlOrPath
 * @param {object} [config]
 * @returns {Promise<any>} axios response
 */
export function coalesceDashboardHttpGet(client, urlOrPath, config = {}) {
  const key = buildDashboardGetCoalesceKey(urlOrPath, config);
  const existing = inflight.get(key);
  if (existing) return existing;

  const cached = recent.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.promise;
  }

  const promise = Promise.resolve()
    .then(() => client.get(urlOrPath, config))
    .then((response) => {
      recent.set(key, { promise: Promise.resolve(response), expires: Date.now() + RECENT_TTL_MS });
      return response;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function resetDashboardHttpGetCoalesce() {
  inflight.clear();
  recent.clear();
}
