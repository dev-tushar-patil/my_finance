import axios from 'axios';

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';
const TOKEN_KEY = 'myfinance.token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

if (USE_MOCK_API) {
  // Lazy-load the mock server so it is excluded from the production bundle when disabled.
  api.defaults.adapter = async (config) => {
    const { mockAdapter } = await import('./mock/mockServer');
    return mockAdapter(config);
  };
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Normalises any error into { status, message, errors } (the backend's ApiError shape). */
export function toApiError(err) {
  const data = err?.response?.data;
  return {
    status: err?.response?.status ?? 0,
    message: data?.message || (err?.response ? 'Something went wrong' : 'Unable to reach the server'),
    errors: data?.errors || null,
  };
}

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(toApiError(err)),
);

export default api;
