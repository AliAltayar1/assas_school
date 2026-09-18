import { axiosInstance, setCsrfToken } from './axiosInstance';

export const authService = {
  // Fetch CSRF Token & set in-memory header state
  getCsrf: async () => {
    const res = await axiosInstance.get('/auth/web/csrf/');
    const csrfToken = res.data?.data?.csrf_token || res.data?.csrf_token;
    if (csrfToken) {
      setCsrfToken(csrfToken);
    }
    return res.data;
  },

  // Login via web cookie authentication
  login: async (identifier, password) => {
    // 1. Fetch CSRF token first
    const csrfResponse = await axiosInstance.get('/auth/web/csrf/');
    const csrfToken = csrfResponse.data?.data?.csrf_token || csrfResponse.data?.csrf_token;

    if (csrfToken) {
      setCsrfToken(csrfToken);
    }

    // 2. Perform Web Login with CSRF header
    const res = await axiosInstance.post(
      '/auth/web/login/',
      { identifier, password },
      {
        headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
      }
    );

    return res.data;
  },

  // Logout session & invalidate cookies
  logout: async () => {
    const res = await axiosInstance.post('/auth/web/logout/');
    return res.data;
  },

  // Fetch current logged in user profile (/auth/web/me/)
  getMe: async () => {
    const res = await axiosInstance.get('/auth/web/me/');
    const data = res.data?.data || res.data;
    if (data && res.data?.meta) {
      data._meta = res.data.meta;
      data.requester_role = res.data.meta.requester_role;
    }
    return data;
  },

  // Update personal user profile (first_name, last_name, email)
  updateMe: async (profileData) => {
    const res = await axiosInstance.patch('/auth/web/me/', profileData);
    return res.data?.data || res.data;
  },

  // Refresh JWT HttpOnly Cookie session
  refresh: async () => {
    const res = await axiosInstance.post('/auth/web/refresh/');
    return res.data;
  },

  // Change password for logged in user (Handles temporary password flow)
  changePassword: async (passwordData) => {
    try {
      await authService.getCsrf();
    } catch (_) {}

    const res = await axiosInstance.post('/auth/web/change-password/', passwordData);
    return res.data;
  },

  // Admin action: Reset password for another user account (returns temporary password once)
  resetUserPassword: async (userId) => {
    const res = await axiosInstance.post(`/accounts/users/${userId}/reset-password/`);
    return res.data;
  },
};
