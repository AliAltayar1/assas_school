import { axiosInstance } from "./axiosInstance";

export const gradesService = {
  // ==========================================
  // 1. ASSESSMENTS LIST & DETAILS
  // ==========================================

  // GET /grades/assessments/
  // Supports filters: academic_year, term, grade_level, section, grade_subject, subject, status,
  // assessment_date_from, assessment_date_to, search, ordering, page, page_size
  getAssessments: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get("/grades/assessments/", {
      params: cleanParams,
    });
    return res.data;
  },

  // GET /grades/assessments/{id}/
  getAssessmentById: async (id) => {
    const res = await axiosInstance.get(`/grades/assessments/${id}/`);
    return res.data;
  },

  // ==========================================
  // 2. CREATE ASSESSMENTS
  // ==========================================

  // POST /grades/assessments/
  // Create an assessment linked to a single section
  // Body: { section, grade_subject, term, title, max_score, assessment_date, allow_duplicate }
  createAssessment: async (data) => {
    const res = await axiosInstance.post("/grades/assessments/", data);
    return res.data;
  },

  // POST /grades/assessments/create-for-grade/
  // Create a single logical assessment linked to ALL sections in the grade level
  // Body: { grade_subject, term, title, max_score, assessment_date, allow_duplicate }
  createAssessmentForGrade: async (data) => {
    const res = await axiosInstance.post(
      "/grades/assessments/create-for-grade/",
      data
    );
    return res.data;
  },

  // ==========================================
  // 3. EDIT & DELETE ASSESSMENTS
  // ==========================================

  // PATCH /grades/assessments/{id}/
  // Partial update of definition: title, max_score, assessment_date, allow_duplicate
  // Note: If published in any section, definition editing is forbidden by backend.
  patchAssessment: async (id, data) => {
    const res = await axiosInstance.patch(`/grades/assessments/${id}/`, data);
    return res.data;
  },

  // DELETE /grades/assessments/{id}/
  // Succeeds only if all sections are Draft AND no student scores exist
  deleteAssessment: async (id) => {
    const res = await axiosInstance.delete(`/grades/assessments/${id}/`);
    return res.data;
  },

  // ==========================================
  // 4. SCORE SHEET & BULK SCORES
  // ==========================================

  // GET /grades/assessments/{id}/scores/?section={sectionId}
  // Fetches students eligible for this assessment in the given section
  getScores: async (assessmentId, sectionId) => {
    const res = await axiosInstance.get(
      `/grades/assessments/${assessmentId}/scores/`,
      {
        params: { section: sectionId },
      }
    );
    return res.data;
  },

  // POST /grades/assessments/{id}/scores/bulk/
  // Bulk enter or update scores for a specific section
  // Body: { section: sectionId, records: [{ enrollment: enrollmentId, score: "18.00" | "0.00" | null }] }
  bulkSaveScores: async (assessmentId, sectionId, records) => {
    const res = await axiosInstance.post(
      `/grades/assessments/${assessmentId}/scores/bulk/`,
      {
        section: sectionId,
        records: records,
      }
    );
    return res.data;
  },

  // ==========================================
  // 5. PUBLISHING (SECTION & GRADE LEVEL)
  // ==========================================

  // POST /grades/assessments/publish-section/
  // Body: { section: sectionId, term: termId }
  // Response includes: { published_count, skipped_future_count }
  publishSection: async (sectionId, termId) => {
    const res = await axiosInstance.post("/grades/assessments/publish-section/", {
      section: sectionId,
      term: termId,
    });
    return res.data;
  },

  // POST /grades/assessments/publish-grade/
  // Body: { grade_level: gradeLevelId, term: termId }
  // Response includes: { published_count, skipped_future_count }
  publishGrade: async (gradeLevelId, termId) => {
    const res = await axiosInstance.post("/grades/assessments/publish-grade/", {
      grade_level: gradeLevelId,
      term: termId,
    });
    return res.data;
  },

  // ==========================================
  // 6. STUDENT TERM RESULTS BREAKDOWN
  // ==========================================

  // GET /grades/assessments/student-results/?enrollment={enrollmentId}&term={termId}
  // Returns student results grouped by subject with total_score, total_max_score, is_complete
  getStudentResults: async (enrollmentId, termId) => {
    const res = await axiosInstance.get("/grades/assessments/student-results/", {
      params: {
        enrollment: enrollmentId,
        term: termId,
      },
    });
    return res.data;
  },
};
