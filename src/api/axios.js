import axios from 'axios';
import config from '../config/api.config';

const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (response) => {
    return response;
  },
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/google');
    
    // Handle authentication errors (401 Unauthorized) - but NOT for login requests
    if (error.response?.status === 401 && !isLoginRequest) {
      console.warn('⚠️ 401 Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Handle "User not found" errors (404) that indicate authentication issues - but NOT for login requests
    if (error.response?.status === 404 && !isLoginRequest &&
        (error.response?.data?.message?.includes('User not found') ||
         error.response?.data?.code === 'USER_NOT_FOUND')) {
      console.warn('⚠️ User not found - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // For login requests, just pass the error through without redirecting
    if (isLoginRequest) {
      console.log('🔐 Login request failed - not redirecting, letting component handle it');
    }
    
    return Promise.reject(error);
  }
);

export default api;
