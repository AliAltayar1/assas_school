import { axiosInstance } from './axiosInstance';

export const usersService = {
  // GET /api/v1/accounts/users/ - List Users with Pagination, Search, Filter, Ordering
  getUsers: async (params = {}) => {
    const res = await axiosInstance.get('/accounts/users/', { params });
    return res.data;
  },

  // GET /api/v1/accounts/users/{id}/ - Fetch User Details
  getUserById: async (id) => {
    const res = await axiosInstance.get(`/accounts/users/${id}/`);
    return res.data;
  },

  // POST /api/v1/accounts/users/ - Create New User (returns temporary_password once)
  createUser: async (userData) => {
    const res = await axiosInstance.post('/accounts/users/', userData);
    return res.data;
  },

  // PATCH /api/v1/accounts/users/{id}/ - Update User (username, email, first_name, last_name, role)
  updateUser: async (id, userData) => {
    const res = await axiosInstance.patch(`/accounts/users/${id}/`, userData);
    return res.data;
  },

  // POST /api/v1/accounts/users/{id}/set-active/ - Activate or Deactivate User
  setActiveStatus: async (id, isActive) => {
    const res = await axiosInstance.post(`/accounts/users/${id}/set-active/`, {
      is_active: isActive,
    });
    return res.data;
  },

  // POST /api/v1/accounts/users/{id}/reset-password/ - Reset User Password (returns temporary_password once)
  resetPassword: async (id) => {
    const res = await axiosInstance.post(`/accounts/users/${id}/reset-password/`);
    return res.data;
  },
};
