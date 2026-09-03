import { axiosInstance } from "./axiosInstance";

export const appointmentsService = {
  /**
   * 1. GET List of appointment requests with optional filters, search, ordering & pagination
   * @param {Object} params - { status, requested_date, guardian, search, ordering, page }
   */
  getAll: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/appointments/", {
      params: cleanParams,
    });
    return res.data;
  },

  /**
   * 2. GET Single appointment details by UUID
   * @param {string} id - Appointment UUID
   */
  getById: async (id) => {
    const res = await axiosInstance.get(`/appointments/${id}/`);
    return res.data;
  },

  /**
   * 3. POST Approve appointment request
   * @param {string} id - Appointment UUID
   */
  approve: async (id) => {
    const res = await axiosInstance.post(`/appointments/${id}/approve/`, {});
    return res.data;
  },

  /**
   * 4. POST Reject appointment request
   * @param {string} id - Appointment UUID
   * @param {string} decisionReason - Mandatory reason for rejecting
   */
  reject: async (id, decisionReason) => {
    const payload = {
      decision_reason:
        typeof decisionReason === "string"
          ? decisionReason.trim()
          : decisionReason,
    };
    const res = await axiosInstance.post(`/appointments/${id}/reject/`, payload);
    return res.data;
  },
};
