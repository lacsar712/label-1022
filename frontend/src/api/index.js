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
  updateBrand: (id, data) => api.put(`/users/${id}/brand`, data),
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

// Tiers API - 达人等级
export const tiersApi = {
  getList: () => api.get('/tiers'),
  getById: (id) => api.get(`/tiers/${id}`),
  create: (data) => api.post('/tiers', data),
  update: (id, data) => api.put(`/tiers/${id}`, data),
  delete: (id) => api.delete(`/tiers/${id}`),
  reorder: (orders) => api.post('/tiers/reorder', { orders })
};

// Influencers API
export const influencersApi = {
  getList: (params) => api.get('/influencers', { params }),
  getById: (id) => api.get(`/influencers/${id}`),
  create: (data) => api.post('/influencers', data),
  update: (id, data) => api.put(`/influencers/${id}`, data),
  delete: (id) => api.delete(`/influencers/${id}`),
  getPlatforms: () => api.get('/influencers/platforms'),
  getPriceHistory: (id) => api.get(`/influencers/${id}/price-history`)
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

// Deliverables API
export const deliverablesApi = {
  getList: (params) => api.get('/deliverables', { params }),
  create: (data) => api.post('/deliverables', data),
  update: (id, data) => api.put(`/deliverables/${id}`, data),
  delete: (id) => api.delete(`/deliverables/${id}`),
  getReviewStatuses: () => api.get('/deliverables/review-statuses'),
  getPlatforms: () => api.get('/deliverables/platforms')
};

// Statistics API
export const statisticsApi = {
  getOverview: () => api.get('/statistics/overview'),
  getPlatformDistribution: () => api.get('/statistics/platform-distribution'),
  getCategoryDistribution: () => api.get('/statistics/category-distribution'),
  getCollaborationStatus: () => api.get('/statistics/collaboration-status'),
  getMonthlyTrends: (months) => api.get('/statistics/monthly-trends', { params: { months } }),
  getTopInfluencers: (params) => api.get('/statistics/top-influencers', { params }),
  getRecentCollaborations: (limit) => api.get('/statistics/recent-collaborations', { params: { limit } }),
  getOperatorKPI: (year, month) => api.get('/statistics/operator-kpi', { params: { year, month } })
};

// Brands API - 品牌方管理（管理员）
export const brandsApi = {
  getList: (params) => api.get('/brands', { params }),
  getById: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
  getAuthorizations: (brandId) => api.get(`/brands/${brandId}/authorizations`),
  createAuthorizations: (brandId, data) => api.post(`/brands/${brandId}/authorizations`, data),
  deleteAuthorization: (brandId, authId) => api.delete(`/brands/${brandId}/authorizations/${authId}`)
};

// Brand Portal API - 品牌方门户（品牌方角色）
export const brandPortalApi = {
  getOverview: () => api.get('/brand-portal/overview'),
  getCollaborations: (params) => api.get('/brand-portal/collaborations', { params }),
  getCollaborationById: (id) => api.get(`/brand-portal/collaborations/${id}`),
  getInfluencers: (params) => api.get('/brand-portal/influencers', { params }),
  getCampaignProgress: (params) => api.get('/brand-portal/campaign-progress', { params }),
  getStatusDistribution: () => api.get('/brand-portal/status-distribution'),
  getEngagementTrend: () => api.get('/brand-portal/engagement-trend')
};

// Pipelines API - 触达漏斗
export const pipelinesApi = {
  getList: (params) => api.get('/pipelines', { params }),
  getById: (id) => api.get(`/pipelines/${id}`),
  getStages: () => api.get('/pipelines/stages'),
  getOwnerOptions: () => api.get('/pipelines/owners/options'),
  create: (data) => api.post('/pipelines', data),
  update: (id, data) => api.put(`/pipelines/${id}`, data),
  updateStage: (id, stage) => api.patch(`/pipelines/${id}/stage`, null, { params: { stage } }),
  delete: (id) => api.delete(`/pipelines/${id}`)
};

// Finance Ledger API - 财务台账
export const financeLedgerApi = {
  getList: (params) => api.get('/finance-ledger', { params }),
  getById: (id) => api.get(`/finance-ledger/${id}`),
  create: (data) => api.post('/finance-ledger', data),
  update: (id, data) => api.put(`/finance-ledger/${id}`, data),
  delete: (id) => api.delete(`/finance-ledger/${id}`),
  getSummary: (params) => api.get('/finance-ledger/summary', { params }),
  getPaymentStatuses: () => api.get('/finance-ledger/payment-statuses'),
  recordPayment: (id, data) => api.post(`/finance-ledger/${id}/payments`, data),
  updatePayment: (id, paymentId, data) => api.put(`/finance-ledger/${id}/payments/${paymentId}`, data),
  deletePayment: (id, paymentId) => api.delete(`/finance-ledger/${id}/payments/${paymentId}`)
};

export const competitiveIntelligenceApi = {
  getList: (params) => api.get('/competitive-intelligence', { params }),
  getById: (id) => api.get(`/competitive-intelligence/${id}`),
  create: (data) => api.post('/competitive-intelligence', data),
  update: (id, data) => api.put(`/competitive-intelligence/${id}`, data),
  delete: (id) => api.delete(`/competitive-intelligence/${id}`)
};

export default api;
