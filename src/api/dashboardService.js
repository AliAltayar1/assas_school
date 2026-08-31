import { axiosInstance } from "./axiosInstance";

export const dashboardService = {
  // GET /api/v1/dashboard/overview/
  getOverview: async () => {
    const res = await axiosInstance.get("/dashboard/overview/");

    return res.data;
  },
};
