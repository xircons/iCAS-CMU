import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Helper to get token from appropriate storage
const getToken = (): string | null => {
  // Check localStorage first (remember me)
  const rememberMe = localStorage.getItem('remember_me') === 'true';
  if (rememberMe) {
    return localStorage.getItem('auth_token');
  }
  // Otherwise check sessionStorage
  return sessionStorage.getItem('auth_token');
};

// Helper to clear token from both storages
const clearToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('remember_me');
  sessionStorage.removeItem('auth_token');
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Note: withCredentials is not needed since we're using Bearer tokens, not cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      // But don't redirect if we're already on the login page (to prevent reload loop)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        clearToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

