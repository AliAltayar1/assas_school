import { axiosInstance } from "./axiosInstance";

export const announcementsService = {
  // 1. GET List of announcements with optional filters, search, ordering & pagination
  getAll: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/announcements/", {
      params: cleanParams,
    });
    return res.data;
  },

  // 2. GET Single announcement details by UUID
  getById: async (id) => {
    const res = await axiosInstance.get(`/announcements/${id}/`);
    return res.data;
  },

  // 3. POST Create new announcement (Supports JSON or FormData for attachments)
  create: async (data) => {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const config = isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};

    const res = await axiosInstance.post("/announcements/", data, config);
    return res.data;
  },

  // 4. PATCH Update existing announcement (Supports JSON or FormData)
  patch: async (id, data) => {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const config = isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};

    const res = await axiosInstance.patch(`/announcements/${id}/`, data, config);
    return res.data;
  },

  // 5. DELETE Announcement by UUID
  delete: async (id) => {
    const res = await axiosInstance.delete(`/announcements/${id}/`);
    return res.data;
  },
};
