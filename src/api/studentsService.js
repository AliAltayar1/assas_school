import { axiosInstance } from "./axiosInstance";

export const studentsService = {
  // ==========================================
  // 1. STUDENTS DIRECTORY (/students/students/)
  // ==========================================
  getStudents: async (params = {}) => {
    const res = await axiosInstance.get("/students/students/", { params });
    return res.data;
  },

  getStudentById: async (id) => {
    const res = await axiosInstance.get(`/students/students/${id}/`);
    return res.data;
  },

  createStudent: async (data) => {
    const res = await axiosInstance.post("/students/students/", data);
    return res.data;
  },

  // POST /api/v1/students/register/ - Full unified registration (Student + Guardian + Health Profile)
  registerStudent: async (data) => {
    const res = await axiosInstance.post("/students/register/", data);
    return res.data;
  },

  // ==========================================
  // 1.1 HEALTH PROFILE (/students/{id}/health-profile/)
  // ==========================================
  getHealthProfile: async (studentId) => {
    const res = await axiosInstance.get(`/students/${studentId}/health-profile/`);
    return res.data;
  },

  updateHealthProfile: async (studentId, data) => {
    const res = await axiosInstance.patch(`/students/${studentId}/health-profile/`, data);
    return res.data;
  },

  updateStudent: async (id, data) => {
    const res = await axiosInstance.patch(`/students/students/${id}/`, data);
    return res.data;
  },

  deleteStudent: async (id) => {
    const res = await axiosInstance.delete(`/students/students/${id}/`);
    return res.data;
  },

  deactivateStudent: async (id) => {
    const res = await axiosInstance.post(`/students/students/${id}/deactivate/`, {});
    return res.data;
  },

  activateStudent: async (id) => {
    const res = await axiosInstance.post(`/students/students/${id}/activate/`, {});
    return res.data;
  },

  // ==========================================
  // 2. GUARDIAN LINKS (/students/guardian-links/)
  // ==========================================
  getGuardianLinks: async (params = {}) => {
    const res = await axiosInstance.get("/students/guardian-links/", { params });
    return res.data;
  },

  getGuardianLinkById: async (id) => {
    const res = await axiosInstance.get(`/students/guardian-links/${id}/`);
    return res.data;
  },

  createGuardianLink: async (data) => {
    const res = await axiosInstance.post("/students/guardian-links/", data);
    return res.data;
  },

  deleteGuardianLink: async (id) => {
    const res = await axiosInstance.delete(`/students/guardian-links/${id}/`);
    return res.data;
  },

  // ==========================================
  // 3. ENROLLMENTS & TRANSFERS (/students/enrollments/)
  // ==========================================
  getEnrollments: async (params = {}) => {
    const res = await axiosInstance.get("/students/enrollments/", { params });
    return res.data;
  },

  getEnrollmentById: async (id) => {
    const res = await axiosInstance.get(`/students/enrollments/${id}/`);
    return res.data;
  },

  createEnrollment: async (data) => {
    const res = await axiosInstance.post("/students/enrollments/", data);
    return res.data;
  },

  updateEnrollment: async (id, data) => {
    const res = await axiosInstance.patch(`/students/enrollments/${id}/`, data);
    return res.data;
  },

  deleteEnrollment: async (id) => {
    const res = await axiosInstance.delete(`/students/enrollments/${id}/`);
    return res.data;
  },

  transferEnrollment: async (id, targetSectionId) => {
    const res = await axiosInstance.post(`/students/enrollments/${id}/transfer/`, {
      section: targetSectionId,
    });
    return res.data;
  },

  // ==========================================
  // 4. COMPREHENSIVE PROFILE (/students/{student_id}/profile/)
  // ==========================================
  getStudentProfile: async (studentId, params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get(`/students/${studentId}/profile/`, {
      params: cleanParams,
    });
    return res.data;
  },
};

