import { axiosInstance } from "./axiosInstance";

export const requestsService = {
  /**
   * 1. GET List of requests with optional filters, search, ordering & pagination
   * @param {Object} params - { request_type, status, student, created_from, created_to, search, ordering, page }
   */
  getAll: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/requests/", {
      params: cleanParams,
    });
    return res.data;
  },

  /**
   * 2. GET Single request details by UUID
   * @param {string} id - Request UUID
   */
  getById: async (id) => {
    const res = await axiosInstance.get(`/requests/${id}/`);
    return res.data;
  },

  /**
   * 3. POST School response to a request
   * @param {string} id - Request UUID
   * @param {string} schoolResponse - Official response text from school
   */
  answer: async (id, schoolResponse) => {
    const payload = {
      school_response: typeof schoolResponse === "string" ? schoolResponse.trim() : schoolResponse,
    };
    const res = await axiosInstance.post(`/requests/${id}/answer/`, payload);
    return res.data;
  },
};
