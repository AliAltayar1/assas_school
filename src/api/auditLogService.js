import { axiosInstance } from './axiosInstance';

export const auditLogService = {
  // GET /api/v1/audit-logs/
  // Supports filters: actor, module, action, date_from, date_to, search, ordering, page, page_size
  getLogs: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get('/audit-logs/', {
      params: cleanParams,
    });
    return res.data;
  },

  // GET /api/v1/audit-logs/{id}/
  // Retrieve details for a single audit log entry
  getLogById: async (id) => {
    const res = await axiosInstance.get(`/audit-logs/${id}/`);
    return res.data;
  },
};
