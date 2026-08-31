import { axiosInstance } from "./axiosInstance";

export const financeService = {
  // ==========================================
  // 1. TUITION PLANS (/finance/tuition-plans/)
  // ==========================================
  getTuitionPlans: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/finance/tuition-plans/", {
      params: cleanParams,
    });
    return res.data;
  },

  createTuitionPlan: async (data) => {
    const res = await axiosInstance.post("/finance/tuition-plans/", data);
    return res.data;
  },

  updateTuitionPlan: async (id, data) => {
    const res = await axiosInstance.patch(`/finance/tuition-plans/${id}/`, data);
    return res.data;
  },

  // ==========================================
  // 2. FINANCIAL ACCOUNTS (/finance/accounts/)
  // ==========================================
  getAccounts: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/finance/accounts/", {
      params: cleanParams,
    });
    return res.data;
  },

  getAccountById: async (id) => {
    const res = await axiosInstance.get(`/finance/accounts/${id}/`);
    return res.data;
  },

  // ==========================================
  // 3. DISCOUNTS (/finance/accounts/{id}/discounts/)
  // ==========================================
  addDiscount: async (accountId, data) => {
    const res = await axiosInstance.post(
      `/finance/accounts/${accountId}/discounts/`,
      data
    );
    return res.data;
  },

  cancelDiscount: async (accountId, discountId, data) => {
    const res = await axiosInstance.post(
      `/finance/accounts/${accountId}/discounts/${discountId}/cancel/`,
      data
    );
    return res.data;
  },

  // ==========================================
  // 4. PAYMENTS (/finance/accounts/{id}/payments/)
  // ==========================================
  recordPayment: async (accountId, data) => {
    const res = await axiosInstance.post(
      `/finance/accounts/${accountId}/payments/`,
      data
    );
    return res.data;
  },

  cancelPayment: async (accountId, paymentId, data) => {
    const res = await axiosInstance.post(
      `/finance/accounts/${accountId}/payments/${paymentId}/cancel/`,
      data
    );
    return res.data;
  },

  // ==========================================
  // 5. REMAINING SYP PREVIEW
  // ==========================================
  previewRemainingSyp: async (accountId, data) => {
    const res = await axiosInstance.post(
      `/finance/accounts/${accountId}/remaining-syp-preview/`,
      data
    );
    return res.data;
  },
};
