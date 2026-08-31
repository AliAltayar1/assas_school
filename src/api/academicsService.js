import { axiosInstance } from './axiosInstance';

export const academicsService = {
  // ==========================================
  // 1. ACADEMIC YEARS (/academics/academic-years/)
  // ==========================================
  getYears: async (params = {}) => {
    const res = await axiosInstance.get('/academics/academic-years/', { params });
    return res.data;
  },

  getYearById: async (id) => {
    const res = await axiosInstance.get(`/academics/academic-years/${id}/`);
    return res.data;
  },

  createYear: async (data) => {
    const res = await axiosInstance.post('/academics/academic-years/', data);
    return res.data;
  },

  updateYear: async (id, data) => {
    const res = await axiosInstance.patch(`/academics/academic-years/${id}/`, data);
    return res.data;
  },

  deleteYear: async (id) => {
    const res = await axiosInstance.delete(`/academics/academic-years/${id}/`);
    return res.data;
  },

  // ==========================================
  // 2. TERMS (/academics/terms/)
  // ==========================================
  getTerms: async (params = {}) => {
    const res = await axiosInstance.get('/academics/terms/', { params });
    return res.data;
  },

  getTermById: async (id) => {
    const res = await axiosInstance.get(`/academics/terms/${id}/`);
    return res.data;
  },

  createTerm: async (data) => {
    const res = await axiosInstance.post('/academics/terms/', data);
    return res.data;
  },

  updateTerm: async (id, data) => {
    const res = await axiosInstance.patch(`/academics/terms/${id}/`, data);
    return res.data;
  },

  deleteTerm: async (id) => {
    const res = await axiosInstance.delete(`/academics/terms/${id}/`);
    return res.data;
  },

  // ==========================================
  // 3. GRADE LEVELS (/academics/grade-levels/)
  // ==========================================
  getGradeLevels: async (params = {}) => {
    const res = await axiosInstance.get('/academics/grade-levels/', { params });
    return res.data;
  },

  getGradeLevelById: async (id) => {
    const res = await axiosInstance.get(`/academics/grade-levels/${id}/`);
    return res.data;
  },

  createGradeLevel: async (data) => {
    const res = await axiosInstance.post('/academics/grade-levels/', data);
    return res.data;
  },

  updateGradeLevel: async (id, data) => {
    const res = await axiosInstance.patch(`/academics/grade-levels/${id}/`, data);
    return res.data;
  },

  deleteGradeLevel: async (id) => {
    const res = await axiosInstance.delete(`/academics/grade-levels/${id}/`);
    return res.data;
  },

  // ==========================================
  // 4. SECTIONS (/academics/sections/)
  // ==========================================
  getSections: async (params = {}) => {
    const res = await axiosInstance.get('/academics/sections/', { params });
    return res.data;
  },

  getSectionById: async (id) => {
    const res = await axiosInstance.get(`/academics/sections/${id}/`);
    return res.data;
  },

  createSection: async (data) => {
    const res = await axiosInstance.post('/academics/sections/', data);
    return res.data;
  },

  updateSection: async (id, data) => {
    const res = await axiosInstance.patch(`/academics/sections/${id}/`, data);
    return res.data;
  },

  deleteSection: async (id) => {
    const res = await axiosInstance.delete(`/academics/sections/${id}/`);
    return res.data;
  },

  // ==========================================
  // 5. SUBJECTS (/academics/subjects/)
  // ==========================================
  getSubjects: async (params = {}) => {
    const res = await axiosInstance.get('/academics/subjects/', { params });
    return res.data;
  },

  getSubjectById: async (id) => {
    const res = await axiosInstance.get(`/academics/subjects/${id}/`);
    return res.data;
  },

  createSubject: async (data) => {
    const res = await axiosInstance.post('/academics/subjects/', data);
    return res.data;
  },

  updateSubject: async (id, data) => {
    const res = await axiosInstance.patch(`/academics/subjects/${id}/`, data);
    return res.data;
  },

  deleteSubject: async (id) => {
    const res = await axiosInstance.delete(`/academics/subjects/${id}/`);
    return res.data;
  },

  // ==========================================
  // 6. GRADE SUBJECTS (/academics/grade-subjects/)
  // ==========================================
  getGradeSubjects: async (params = {}) => {
    const res = await axiosInstance.get('/academics/grade-subjects/', { params });
    return res.data;
  },

  getGradeSubjectById: async (id) => {
    const res = await axiosInstance.get(`/academics/grade-subjects/${id}/`);
    return res.data;
  },

  createGradeSubject: async (data) => {
    const res = await axiosInstance.post('/academics/grade-subjects/', data);
    return res.data;
  },

  updateGradeSubject: async (id, data) => {
    const res = await axiosInstance.patch(`/academics/grade-subjects/${id}/`, data);
    return res.data;
  },

  deleteGradeSubject: async (id) => {
    const res = await axiosInstance.delete(`/academics/grade-subjects/${id}/`);
    return res.data;
  },
};
