import { axiosInstance } from "./axiosInstance";

export const homeworkService = {
  // 1. GET List of homeworks with optional filters, search, ordering & pagination
  getAll: async (params = {}) => {
    // Clean empty/null/undefined params
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/homework/homeworks/", {
      params: cleanParams,
    });
    return res.data;
  },

  // 2. GET Single homework details by UUID
  getById: async (id) => {
    const res = await axiosInstance.get(`/homework/homeworks/${id}/`);
    return res.data;
  },

  // 3. POST Create new homework (Supports JSON or FormData for attachments)
  create: async (data) => {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const config = isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};

    const res = await axiosInstance.post("/homework/homeworks/", data, config);
    return res.data;
  },

  // 4. PATCH Update existing homework (Supports JSON or FormData)
  patch: async (id, data) => {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const config = isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};

    const res = await axiosInstance.patch(`/homework/homeworks/${id}/`, data, config);
    return res.data;
  },

  // 5. DELETE Homework by UUID
  delete: async (id) => {
    const res = await axiosInstance.delete(`/homework/homeworks/${id}/`);
    return res.data;
  },
};
