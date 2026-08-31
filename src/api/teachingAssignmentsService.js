import { axiosInstance } from "./axiosInstance";

export const teachingAssignmentsService = {
  // 1. GET List of assignments with optional search, filters & pagination
  getAll: async (params = {}) => {
    const res = await axiosInstance.get("/teaching/assignments/", { params });
    return res.data;
  },

  // 2. GET Single assignment by ID
  getById: async (id) => {
    const res = await axiosInstance.get(`/teaching/assignments/${id}/`);
    return res.data;
  },

  // 3. POST Create new assignment
  create: async (data) => {
    const res = await axiosInstance.post("/teaching/assignments/", data);
    console.log(res);
    return res.data;
  },

  // 4. PATCH Update existing assignment (partial update)
  patch: async (id, data) => {
    const res = await axiosInstance.patch(`/teaching/assignments/${id}/`, data);
    return res.data;
  },

  // 5. DELETE Assignment (/teaching/assignments/{id}/)
  delete: async (id) => {
    const res = await axiosInstance.delete(`/teaching/assignments/${id}/`);
    return res.data;
  },

  // 6. POST End assignment action (/end/)
  endAssignment: async (id, endDate) => {
    const payload = endDate ? { end_date: endDate } : {};
    const res = await axiosInstance.post(
      `/teaching/assignments/${id}/end/`,
      payload,
    );
    return res.data;
  },

  // 7. POST Reopen assignment action (/reopen/)
  reopenAssignment: async (id) => {
    const res = await axiosInstance.post(
      `/teaching/assignments/${id}/reopen/`,
      {},
    );
    return res.data;
  },
};
