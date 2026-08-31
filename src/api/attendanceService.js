import { axiosInstance } from './axiosInstance';

export const attendanceService = {
  // ==========================================
  // 1. ATTENDANCE ROSTER (/attendance/sheets/roster/)
  // ==========================================
  /**
   * Fetch official Attendance Roster for a section.
   * This is the Single Source of Truth for daily attendance.
   * Read-only, does not create sheets or audit records.
   * @param {string} sectionId - UUID of the section
   */
  getRoster: async (sectionId) => {
    const res = await axiosInstance.get('/attendance/sheets/roster/', {
      params: { section: sectionId },
    });
    return res.data;
  },

  // ==========================================
  // 2. ATTENDANCE SHEETS (/attendance/sheets/)
  // ==========================================
  /**
   * List attendance sheets with filtering and pagination.
   * @param {Object} params - { section, attendance_date, grade_level, academic_year, created_by, ordering, page, page_size }
   */
  getSheets: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get('/attendance/sheets/', {
      params: cleanParams,
    });
    return res.data;
  },

  /**
   * Get attendance sheet details with all associated student records.
   * @param {string} id - UUID of the sheet
   */
  getSheetById: async (id) => {
    const res = await axiosInstance.get(`/attendance/sheets/${id}/`);
    return res.data;
  },

  /**
   * Create a new morning attendance sheet for a section.
   * Note: Do NOT send attendance_date (server determines it via timezone.localdate()).
   * Note: Do NOT send departure fields on morning sheet creation.
   * @param {Object} data - { section: UUID, records: Array }
   */
  createSheet: async (data) => {
    const res = await axiosInstance.post('/attendance/sheets/', data);
    return res.data;
  },

  /**
   * Bulk update multiple records within an existing sheet.
   * @param {string} sheetId - UUID of the sheet
   * @param {Object} data - { records: [ { id: UUID, ...fields } ] }
   */
  bulkUpdateSheet: async (sheetId, data) => {
    const res = await axiosInstance.post(`/attendance/sheets/${sheetId}/bulk-update/`, data);
    return res.data;
  },

  /**
   * Apply normal uniform departure to all present students in the sheet who haven't departed yet.
   * @param {string} sheetId - UUID of the sheet
   * @param {Object} data - { departure_time: "HH:MM:SS", departure_method: "guardian" }
   */
  normalDeparture: async (sheetId, data) => {
    const res = await axiosInstance.post(`/attendance/sheets/${sheetId}/normal-departure/`, data);
    return res.data;
  },

  // ==========================================
  // 3. ATTENDANCE RECORDS (/attendance/records/)
  // ==========================================
  /**
   * List and search individual attendance records with filters.
   * @param {Object} params - { sheet, section, attendance_date, student, status, absence_type, search, page, page_size }
   */
  getRecords: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});

    const res = await axiosInstance.get('/attendance/records/', {
      params: cleanParams,
    });
    return res.data;
  },

  /**
   * Get single attendance record details.
   * @param {string} id - UUID of the record
   */
  getRecordById: async (id) => {
    const res = await axiosInstance.get(`/attendance/records/${id}/`);
    return res.data;
  },

  /**
   * Partially update a single student's attendance record (e.g. status change, early departure).
   * @param {string} id - UUID of the record
   * @param {Object} data - Partial fields to update
   */
  updateRecord: async (id, data) => {
    const res = await axiosInstance.patch(`/attendance/records/${id}/`, data);
    return res.data;
  },
};
