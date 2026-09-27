/**
 * Attendance Module Constants, Enums, and Helpers
 * Strictly adhering to Backend Specifications for Asas School Platform.
 */

// 1. Attendance Statuses
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  UNMARKED: 'unmarked',
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'حاضر',
  absent: 'غائب',
  unmarked: 'غير محدد',
};

// 2. Absence Types
export const ABSENCE_TYPE = {
  EXCUSED: 'excused',
  UNEXCUSED: 'unexcused',
};

export const ABSENCE_TYPE_LABELS = {
  excused: 'بعذر',
  unexcused: 'دون عذر',
};

// 3. Absence Reason Sources
export const ABSENCE_REASON_SOURCE = {
  GUARDIAN: 'guardian',
  SCHOOL: 'school',
};

export const ABSENCE_REASON_SOURCE_LABELS = {
  guardian: 'ولي الأمر',
  school: 'إدارة المدرسة',
};

export const ABSENCE_REASON_SOURCE_OPTIONS = [
  { value: 'guardian', label: 'ولي الأمر' },
  { value: 'school', label: 'إدارة المدرسة' },
];

// 4. Arrival & Departure Methods (Only school_bus & guardian are supported by backend)
export const ARRIVAL_METHODS = [
  { value: 'school_bus', label: 'باص المدرسة' },
  { value: 'guardian', label: 'ولي الأمر' },
];

export const DEPARTURE_METHODS = [
  { value: 'school_bus', label: 'باص المدرسة' },
  { value: 'guardian', label: 'ولي الأمر' },
];

export const METHOD_LABELS = {
  school_bus: 'باص المدرسة',
  guardian: 'ولي الأمر',
};

// 5. Attendance Module Permissions
export const ATTENDANCE_PERMS = {
  VIEW_SHEET: 'attendance.view_attendancesheet',
  ADD_SHEET: 'attendance.add_attendancesheet',
  VIEW_RECORD: 'attendance.view_attendancerecord',
  CHANGE_RECORD: 'attendance.change_attendancerecord',
  CHANGE_SHEET: 'attendance.change_attendancesheet',
};

// 6. Defaults & Predefined lists
export const DEFAULT_ARRIVAL_TIME = '07:45:00';
export const DEFAULT_DEPARTURE_TIME = '13:30:00';

export const COMMON_ABSENCE_REASONS = [
  'مرض',
  'مراجعة طبية',
  'ظرف عائلي طارئ',
  'سفر',
  'سوء أحوال جوية',
  'عذر رسمي مقبول',
];

// 7. Date & Time Helpers
export function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatArabicDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const dayName = new Intl.DateTimeFormat('ar-SY', { weekday: 'long' }).format(d);
    const formatted = new Intl.DateTimeFormat('ar-SY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return `${dayName} - ${formatted}`;
  } catch (_) {
    return dateStr;
  }
}

export function isWeekendDate(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay(); // 0: Sunday, 5: Friday, 6: Saturday
    return day === 5 || day === 6;
  } catch (_) {
    return false;
  }
}

export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  // Convert "07:45:00" or "07:45" to Arabic 12-hour or neat 24-hour
  try {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const period = h >= 12 ? 'م' : 'ص';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${period}`;
  } catch (_) {
    return timeStr;
  }
}
