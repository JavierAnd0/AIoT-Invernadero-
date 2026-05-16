import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url    = err.config?.url || '';

    // 401 on auth endpoints = wrong credentials / expected failure — let the
    // component handle the error message, do NOT reload.
    const isAuthEndpoint = url.includes('/auth/login') ||
                           url.includes('/auth/bootstrap') ||
                           url.includes('/auth/change-password') ||
                           url.includes('/auth/me');   // getMe() during OAuth callback must not force-reload

    if (status === 401 && !isAuthEndpoint) {
      // Expired or revoked token — clear session and return to login without
      // a full page reload so the error state is preserved in the component.
      ['token', 'user', 'tenants', 'tenantId', 'role'].forEach(k =>
        localStorage.removeItem(k)
      );
      window.location.replace('/');
    }
    return Promise.reject(err);
  }
);

// AUTH
export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
/** Verify a token explicitly (used by OAuth callback before committing the session). */
export const getMeWithToken = (token) =>
  api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
export const register = (data) =>
  api.post('/auth/register', data).then(r => r.data);
// Alias for backward compatibility with RegisterScreen
export const bootstrap = register;
export const selectTenant = (tenantId) =>
  api.post('/auth/select-tenant', { tenant_id: tenantId }).then(r => r.data);
export const loginWithGoogle = () => {
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
  // VITE_API_URL might end in /api/v1, so we strip it out to hit the root context /oauth2/authorization/google
  const rootUrl = apiBase.replace(/\/api\/v1\/?$/, '');
  window.location.href = `${rootUrl}/oauth2/authorization/google`;
};

// TENANTS (admin) - Not supported in Spring Boot Backend currently
// export const getTenantMembers  = (tenantId) =>
//   api.get(`/tenants/${tenantId}/members`).then(r => r.data);
// export const inviteMember = (tenantId, data) =>
//   api.post(`/tenants/${tenantId}/members`, data).then(r => r.data);
// export const updateMember = (tenantId, userId, data) =>
//   api.put(`/tenants/${tenantId}/members/${userId}`, data).then(r => r.data);
// export const removeMember = (tenantId, userId) =>
//   api.delete(`/tenants/${tenantId}/members/${userId}`).then(r => r.data);

// ZONES
export const getZones   = ()      => api.get('/zones').then(r => r.data);
export const createZone = (data)  => api.post('/zones', data).then(r => r.data);
export const updateZone = (id, d) => api.put(`/zones/${id}`, d).then(r => r.data);

// DEVICES
export const getDevices         = (params)    => api.get('/devices', { params }).then(r => r.data);
export const createDevice       = (data)       => api.post('/devices', data).then(r => r.data);
export const updateDeviceStatus = (id, status) =>
  api.put(`/devices/${id}/status`, { status }).then(r => r.data);

// SENSOR READINGS
export const getReadings       = (params) => api.get('/readings', { params }).then(r => r.data);
export const getLatestReadings = ()       => api.get('/readings/latest').then(r => r.data);
export const getDeviceReadings = (id, p)  =>
  api.get(`/readings/device/${id}`, { params: p }).then(r => r.data);
export const postReading = (data) => api.post('/readings', data).then(r => r.data);

// CROP TYPES
export const getCropTypes   = ()     => api.get('/crop-types').then(r => r.data);
export const createCropType = (data) => api.post('/crop-types', data).then(r => r.data);

// CROPS
export const getCrops       = (params) => api.get('/crops', { params }).then(r => r.data);
export const createCrop     = (data)   => api.post('/crops', data).then(r => r.data);
export const updateCrop     = (id, d)  => api.put(`/crops/${id}`, d).then(r => r.data);
export const getCropsByZone = (zoneId) => api.get(`/crops/zone/${zoneId}`).then(r => r.data);

// ALERTS
export const getAlerts        = (params) => api.get('/alerts', { params }).then(r => r.data);
export const getOpenAlerts    = ()       => api.get('/alerts/open').then(r => r.data);
export const acknowledgeAlert = (id)     => api.put(`/alerts/${id}/acknowledge`).then(r => r.data);
export const resolveAlert     = (id)     => api.put(`/alerts/${id}/resolve`).then(r => r.data);

// AI PREDICTIONS
export const predict              = (data)   => api.post('/predict', data).then(r => r.data);
export const getPredictions       = (params) => api.get('/predictions', { params }).then(r => r.data);
export const getDevicePredictions = (id)     => api.get(`/predictions/device/${id}`).then(r => r.data);

// USERS — list/update/deactivate existing tenant members
// NOTE: creating users is done via inviteMember (POST /tenants/<id>/members)
export const getUsers   = (params) => api.get('/users', { params }).then(r => r.data);
export const updateUser = (id, d)  => api.put(`/users/${id}`, d).then(r => r.data);
export const deleteUser = (id)     => api.delete(`/users/${id}`).then(r => r.data);

// PROFILE (own user) - Not supported in Spring Boot Backend currently
// export const updateProfile    = (data) => api.patch('/auth/profile', data).then(r => r.data);
// export const changePassword   = (data) => api.post('/auth/change-password', data).then(r => r.data);

// SIMULATOR
export const startSimulator     = (interval_seconds) =>
  api.post('/simulator/start', { interval_seconds }).then(r => r.data);
export const stopSimulator      = () => api.post('/simulator/stop').then(r => r.data);
export const getSimulatorStatus = () => api.get('/simulator/status').then(r => r.data);

export default api;
