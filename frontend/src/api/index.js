import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Track recent error messages to prevent duplicates
const recentMessages = new Set();

// Show error message (with deduplication)
const showError = (message) => {
  if (recentMessages.has(message)) return;
  recentMessages.add(message);
  setTimeout(() => recentMessages.delete(message), 2000);
  
  // Dispatch custom event for toast
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { type: 'error', message }
  }));
};

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
    return response.data;
  },
  (error) => {
    // Already handled business error
    if (error._isBusinessError) {
      return Promise.reject(error);
    }
    
    let message = '请求失败，请稍后重试';
    let shouldShowError = true;
    
    if (error.response) {
      const { status, data } = error.response;
      
      // Get error message from response
      if (data && data.detail) {
        message = data.detail;
      } else {
        // Default messages based on status code
        switch (status) {
          case 400:
            message = '请求参数错误';
            break;
          case 401:
            // Clear token and redirect to login silently
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
              // Don't show error for 401, just redirect
              shouldShowError = false;
              window.location.href = '/login';
            }
            message = '登录已过期，请重新登录';
            break;
          case 403:
            message = '权限不足';
            break;
          case 404:
            message = '请求的资源不存在';
            break;
          case 500:
            message = '服务器错误，请稍后重试';
            break;
          default:
            message = `请求失败 (${status})`;
        }
      }
    } else if (error.request) {
      message = '网络错误，请检查网络连接';
    }
    
    if (shouldShowError) {
      showError(message);
    }
    
    const err = new Error(message);
    err._isBusinessError = true;
    return Promise.reject(err);
  }
);

// Auth API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
};

// Users API
export const usersApi = {
  getList: (params) => api.get('/users', { params }),
  getCount: (params) => api.get('/users/count', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
  updateStatus: (id, data) => api.put(`/users/${id}/status`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles')
};

// Profile API
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  changePassword: (data) => api.put('/profile/password', data)
};

// Categories API
export const categoriesApi = {
  getList: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Influencers API
export const influencersApi = {
  getList: (params) => api.get('/influencers', { params }),
  getById: (id) => api.get(`/influencers/${id}`),
  create: (data) => api.post('/influencers', data),
  update: (id, data) => api.put(`/influencers/${id}`, data),
  delete: (id) => api.delete(`/influencers/${id}`),
  getPlatforms: () => api.get('/influencers/platforms')
};

// Collaborations API
export const collaborationsApi = {
  getList: (params) => api.get('/collaborations', { params }),
  getById: (id) => api.get(`/collaborations/${id}`),
  create: (data) => api.post('/collaborations', data),
  update: (id, data) => api.put(`/collaborations/${id}`, data),
  updateStatus: (id, data) => api.put(`/collaborations/${id}/status`, data),
  delete: (id) => api.delete(`/collaborations/${id}`),
  getStatuses: () => api.get('/collaborations/statuses'),
  getContentTypes: () => api.get('/collaborations/content-types')
};

// Statistics API
export const statisticsApi = {
  getOverview: () => api.get('/statistics/overview'),
  getPlatformDistribution: () => api.get('/statistics/platform-distribution'),
  getCategoryDistribution: () => api.get('/statistics/category-distribution'),
  getCollaborationStatus: () => api.get('/statistics/collaboration-status'),
  getMonthlyTrends: (months) => api.get('/statistics/monthly-trends', { params: { months } }),
  getTopInfluencers: (params) => api.get('/statistics/top-influencers', { params }),
  getRecentCollaborations: (limit) => api.get('/statistics/recent-collaborations', { params: { limit } })
};

export default api;
