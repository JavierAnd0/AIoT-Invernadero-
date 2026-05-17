import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: BASE_URL });

// ── Normalizer ────────────────────────────────────────────────────────────────
const LOWERCASE_VALUE_KEYS = new Set([
  'status', 'severity', 'alert_type', 'alertType',
  'device_type', 'deviceType', 'predicted_class', 'predictedClass',
]);

function normalizeApiPayload(value, key = '') {
  if (Array.isArray(value)) return value.map(item => normalizeApiPayload(item));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeApiPayload(v, k)])
    );
  if (typeof value === 'string' && LOWERCASE_VALUE_KEYS.has(key)) return value.toLowerCase();
  return value;
}

// ── Interceptors ──────────────────────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => { res.data = normalizeApiPayload(res.data); return res; },
  err => {
    if (err.response?.data?.message && !err.response.data.error)
      err.response.data.error = err.response.data.message;

    const status = err.response?.status;
    const url    = err.config?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/bootstrap') ||
      url.includes('/auth/change-password') || url.includes('/auth/me');

    if (status === 401 && !isAuthEndpoint) {
      ['token', 'user', 'tenants', 'tenantId', 'role'].forEach(k => localStorage.removeItem(k));
      window.location.replace('/');
    }
    return Promise.reject(err);
  }
);

// ── Cache layer ───────────────────────────────────────────────────────────────
// _store: cache entries { data, ts }
// _fly:   in-flight promises (request deduplication)
const _store = new Map();
const _fly   = new Map();

const TTL = {
  xs:  10_000,  // simulator status
  sm:  15_000,  // sensor readings (change often)
  md:  25_000,  // alerts (slightly under 30s poll interval)
  lg:  30_000,  // devices, crops
  xl:  60_000,  // zones, users, predictions
  xxl: 120_000, // crop types (almost static)
};

/**
 * Wrap a GET fetch with TTL cache + in-flight deduplication.
 * - If data is cached and fresh → returns it immediately (Promise.resolve)
 * - If same key is already being fetched → shares the same promise (no duplicate network calls)
 * - Otherwise → fires new network request and populates cache on success
 */
function cached(key, fetchFn, ttl = TTL.lg) {
  const hit = _store.get(key);
  if (hit && Date.now() - hit.ts < ttl) return Promise.resolve(hit.data);

  if (_fly.has(key)) return _fly.get(key);

  const req = fetchFn()
    .then(data => {
      _store.set(key, { data, ts: Date.now() });
      _fly.delete(key);
      return data;
    })
    .catch(err => {
      _fly.delete(key);
      throw err;
    });

  _fly.set(key, req);
  return req;
}

/**
 * Invalidate cache entries by exact key or prefix (e.g. 'crops*').
 * Call this after mutations so the next read fetches fresh data.
 */
export function invalidate(...patterns) {
  patterns.forEach(p => {
    if (p.endsWith('*')) {
      const prefix = p.slice(0, -1);
      for (const k of _store.keys()) if (k.startsWith(prefix)) _store.delete(k);
      for (const k of _fly.keys())   if (k.startsWith(prefix)) _fly.delete(k);
    } else {
      _store.delete(p);
      _fly.delete(p);
    }
  });
}

/** Serialize params to a stable cache key segment. */
const pk = (p) => JSON.stringify(p ?? null);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const getMeWithToken = (token) =>
  api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
export const register  = (data)     => api.post('/auth/register', data).then(r => r.data);
export const bootstrap = register;
export const selectTenant = (tenantId) =>
  api.post('/auth/select-tenant', { tenant_id: tenantId }).then(r => r.data);
export const loginWithGoogle = () => {
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
  const rootUrl = apiBase.replace(/\/api\/v1\/?$/, '');
  window.location.href = `${rootUrl}/oauth2/authorization/google`;
};

// ── Zones ─────────────────────────────────────────────────────────────────────
export const getZones = () =>
  cached('zones', () => api.get('/zones').then(r => r.data), TTL.xl);

export const createZone = (data) =>
  api.post('/zones', data).then(r => { invalidate('zones'); return r.data; });

export const updateZone = (id, d) =>
  api.put(`/zones/${id}`, d).then(r => { invalidate('zones'); return r.data; });

// ── Devices ───────────────────────────────────────────────────────────────────
export const getDevices = (params) =>
  cached(`devices:${pk(params)}`, () => api.get('/devices', { params }).then(r => r.data), TTL.lg);

export const createDevice = (data) =>
  api.post('/devices', data).then(r => { invalidate('devices*'); return r.data; });

export const updateDeviceStatus = (id, status) =>
  api.put(`/devices/${id}/status`, { status }).then(r => { invalidate('devices*'); return r.data; });

// ── Sensor readings ───────────────────────────────────────────────────────────
export const getReadings       = (params) =>
  cached(`readings:${pk(params)}`, () => api.get('/readings', { params }).then(r => r.data), TTL.sm);
export const getLatestReadings = () =>
  cached('readings:latest', () => api.get('/readings/latest').then(r => r.data), TTL.sm);
export const getDeviceReadings = (id, p) =>
  cached(`readings:device:${id}:${pk(p)}`, () =>
    api.get(`/readings/device/${id}`, { params: p }).then(r => r.data), TTL.sm);
export const postReading = (data) => api.post('/readings', data).then(r => r.data);

// ── Crop types ────────────────────────────────────────────────────────────────
export const getCropTypes = () =>
  cached('crop-types', () => api.get('/crop-types').then(r => r.data), TTL.xxl);

export const createCropType = (data) =>
  api.post('/crop-types', data).then(r => { invalidate('crop-types'); return r.data; });

// ── Crops ─────────────────────────────────────────────────────────────────────
export const getCrops = (params) =>
  cached(`crops:${pk(params)}`, () => api.get('/crops', { params }).then(r => r.data), TTL.lg);

export const createCrop = (data) =>
  api.post('/crops', data).then(r => { invalidate('crops*'); return r.data; });

export const updateCrop = (id, d) =>
  api.put(`/crops/${id}/status`, d).then(r => { invalidate('crops*'); return r.data; });

export const getCropsByZone = (zoneId) =>
  cached(`crops:zone:${zoneId}`, () =>
    api.get(`/crops/zone/${zoneId}`).then(r => r.data), TTL.lg);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = (params) =>
  cached(`alerts:${pk(params)}`, () => api.get('/alerts', { params }).then(r => r.data), TTL.md);

// TTL slightly under 30 s so each polling interval triggers a real fetch
export const getOpenAlerts = () =>
  cached('alerts:open', () => api.get('/alerts/open').then(r => r.data), TTL.md);

export const acknowledgeAlert = (id) =>
  api.put(`/alerts/${id}/acknowledge`).then(r => { invalidate('alerts*'); return r.data; });

export const resolveAlert = (id) =>
  api.put(`/alerts/${id}/resolve`).then(r => { invalidate('alerts*'); return r.data; });

// ── AI Predictions ────────────────────────────────────────────────────────────
export const predict = (data) => api.post('/predictions/predict', data).then(r => r.data);

export const getPredictions = (params) =>
  cached(`predictions:${pk(params)}`, () =>
    api.get('/predictions', { params }).then(r => r.data), TTL.xl);

export const getDevicePredictions = (id) =>
  cached(`predictions:device:${id}`, () =>
    api.get(`/predictions/device/${id}`).then(r => r.data), TTL.xl);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = (params) =>
  cached(`users:${pk(params)}`, () => api.get('/users', { params }).then(r => r.data), TTL.xl);

export const updateUser = (id, d) =>
  api.put(`/users/${id}`, d).then(r => { invalidate('users*'); return r.data; });

export const deleteUser = (id) =>
  api.delete(`/users/${id}`).then(r => { invalidate('users*'); return r.data; });

// ── Simulator ─────────────────────────────────────────────────────────────────
export const startSimulator = (interval_seconds) =>
  api.post('/simulator/start', { interval_seconds }).then(r => r.data);
export const stopSimulator = () =>
  api.post('/simulator/stop').then(r => r.data);
export const getSimulatorStatus = () =>
  cached('simulator:status', () => api.get('/simulator/status').then(r => r.data), TTL.xs);

// ── Cache warm-up ─────────────────────────────────────────────────────────────
/**
 * Fire a set of common requests immediately after login so the cache is warm
 * by the time the user reaches the Dashboard. Best-effort — errors are swallowed.
 */
export function prefetchCommon() {
  [getZones(), getDevices(), getOpenAlerts(), getCropTypes()].forEach(p =>
    p.catch(() => {})
  );
}

export default api;
