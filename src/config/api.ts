import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export const api = axios.create({
  baseURL: API_URL,
  // Don't set Content-Type header here - let axios set it automatically
  // For JSON requests, axios will set 'application/json'
  // For FormData requests, axios will set 'multipart/form-data' with boundary
  withCredentials: true, // Send cookies with requests
  timeout: 3000, // 3 second timeout for all requests
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const currentPath = window.location.pathname;
      
      // Skip refresh attempt if on login page or if this is the initial auth check
      // (initial auth check is /auth/me and we're not already on login)
      if (currentPath === '/login' || (originalRequest.url?.includes('/auth/me') && !isRefreshing)) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api.request(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the access token
        await api.post('/auth/refresh');
        processQueue(null, null);
        // Retry the original request
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Don't redirect here - let the App component handle redirects
        // This prevents double redirects and allows proper React Router navigation
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

