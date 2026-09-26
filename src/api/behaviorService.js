import { axiosInstance } from "./axiosInstance";

export const behaviorService = {
  // 1. GET List of behavior notes with filters, search, ordering & pagination
  getNotes: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});
    const res = await axiosInstance.get("/behavior/notes/", {
      params: cleanParams,
    });
    return res.data;
  },

  // 2. GET Single behavior note by ID
  getNoteById: async (id) => {
    const res = await axiosInstance.get(`/behavior/notes/${id}/`);
    return res.data;
  },

  // 3. POST Create new behavior note
  createNote: async (data) => {
    const res = await axiosInstance.post("/behavior/notes/", data);
    return res.data;
  },

  // 4. PATCH Update existing behavior note
  updateNote: async (id, data) => {
    const res = await axiosInstance.patch(`/behavior/notes/${id}/`, data);
    return res.data;
  },

  // 5. DELETE Remove behavior note
  deleteNote: async (id) => {
    const res = await axiosInstance.delete(`/behavior/notes/${id}/`);
    return res.data;
  },

  // ==========================================
  // STUDENT POINTS APIS (/behavior/points/)
  // ==========================================
  // 6. GET List student points records with filters, search, ordering & pagination
  getPoints: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});
    const res = await axiosInstance.get("/behavior/points/", {
      params: cleanParams,
    });
    return res.data;
  },

  // 7. GET Single student point record
  getPointById: async (id) => {
    const res = await axiosInstance.get(`/behavior/points/${id}/`);
    return res.data;
  },

  // 8. POST Add student points (body: { enrollment, points, note, occurred_on })
  createPoint: async (data) => {
    const res = await axiosInstance.post("/behavior/points/", data);
    return res.data;
  },

  // 9. PATCH Update student points (body: { points, note, occurred_on })
  updatePoint: async (id, data) => {
    const res = await axiosInstance.patch(`/behavior/points/${id}/`, data);
    return res.data;
  },

  // 10. DELETE Remove student points record
  deletePoint: async (id) => {
    const res = await axiosInstance.delete(`/behavior/points/${id}/`);
    return res.data;
  },
};
