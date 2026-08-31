/**
 * Permission Utilities for Asas School Platform.
 * Enforces role-based visibility and access restrictions across the application.
 */

// Normalized Role Extractor
export function getUserRole(user) {
  if (!user) return "";
  const role = (
    user.role ||
    user.role_code ||
    user.role_name ||
    ""
  ).toLowerCase();
  return role;
}

// 1. Role Identifiers
export function isSchoolAdmin(user) {
  const role = getUserRole(user);
  return role === "school_admin" || role === "admin";
}

export function isSecretariat(user) {
  const role = getUserRole(user);
  return role === "secretariat" || role === "secretary";
}

export function isSupervisor(user) {
  const role = getUserRole(user);
  return role === "supervisor" || role === "educational_supervisor";
}

export function isTeacher(user) {
  const role = getUserRole(user);
  return role === "teacher";
}

export function isGuardian(user) {
  const role = getUserRole(user);
  return role === "guardian";
}

export function isTechSupport(user) {
  const role = getUserRole(user);
  return role === "tech_support";
}

// 2. Administrative Role Check (school_admin, secretariat, supervisor)
export function isAdministrativeRole(user) {
  return isSchoolAdmin(user) || isSecretariat(user) || isSupervisor(user);
}

// 3. Specific Capability Checks
// Manage Academic Structure (Years, Terms, Grades, Sections, Subjects, Grade Subjects)
export function canManageAcademics(user) {
  return isSchoolAdmin(user) || isSecretariat(user) || isSupervisor(user);
}

// Manage Students, Enrollments, Transfers, Guardian Links
export function canManageStudents(user) {
  return isSchoolAdmin(user) || isSecretariat(user) || isSupervisor(user);
}

// Manage Teaching Assignments (Create, Edit, Delete, End, Reopen)
export function canManageTeachingAssignments(user) {
  return isSchoolAdmin(user) || isSupervisor(user);
}

// Manage User Accounts & Staff
export function canManageUsers(user) {
  return isSchoolAdmin(user);
}

// Manage School Requests (Complaints, Suggestions, Inquiries - View & Answer)
export function canManageSchoolRequests(user) {
  if (isTeacher(user) || isTechSupport(user)) return false;
  return isAdministrativeRole(user);
}

// Manage Finance: Access Financial Module
export function canAccessFinance(user) {
  if (isTeacher(user) || isSupervisor(user) || isTechSupport(user)) return false;
  return isSchoolAdmin(user) || isSecretariat(user);
}

// Manage Finance: Manage Tuition Plans (Create, Edit Base Tuition in USD)
export function canManageTuitionPlans(user) {
  return isSchoolAdmin(user);
}

// Manage Finance: Manage Discounts (Add, Cancel Discounts)
export function canManageDiscounts(user) {
  return isSchoolAdmin(user);
}

// Manage Finance: Cancel Payments & Transactions
export function canCancelFinanceTransactions(user) {
  return isSchoolAdmin(user);
}

// Manage Finance: Record Cash Payments
export function canRecordPayments(user) {
  return isSchoolAdmin(user) || isSecretariat(user);
}

// Manage Finance: Preview Remaining Amount in SYP
export function canPreviewRemainingSyp(user) {
  return isSchoolAdmin(user) || isSecretariat(user);
}

// Manage Appointments: Access Appointments Module (School Admin & Secretariat only)
export function canAccessAppointments(user) {
  if (isTeacher(user) || isSupervisor(user) || isTechSupport(user)) return false;
  return isSchoolAdmin(user) || isSecretariat(user);
}

// Manage Appointments: Approve & Reject Appointment Requests
export function canDecideAppointments(user) {
  if (isTeacher(user) || isSupervisor(user) || isTechSupport(user)) return false;
  return isSchoolAdmin(user) || isSecretariat(user);
}

// General check: can perform mutation actions (Add, Edit, Delete, Transfer, End, Reopen)
export function canMutateData(user) {
  if (isTeacher(user)) return false;
  return isAdministrativeRole(user);
}

// 4. Grades & Assessments Module Capabilities
// Access Grades Web Module (School Admin, Supervisor, Teacher) - Secretariat, Tech Support, Guardian are blocked
export function canAccessGrades(user) {
  if (isSecretariat(user) || isTechSupport(user) || isGuardian(user)) return false;
  return isSchoolAdmin(user) || isSupervisor(user) || isTeacher(user);
}

// Publish Grades (School Admin & Supervisor only)
export function canPublishGrades(user) {
  return isSchoolAdmin(user) || isSupervisor(user);
}

// Create Assessment for Whole Grade Level (School Admin & Supervisor only)
export function canCreateAssessmentForGrade(user) {
  return isSchoolAdmin(user) || isSupervisor(user);
}

// Enter & Edit Student Scores (School Admin, Supervisor, and assigned Teachers)
export function canEnterGrades(user) {
  return isSchoolAdmin(user) || isSupervisor(user) || isTeacher(user);
}

// 5. General Audit Logs Capabilities
// Access Audit Logs (School Admin & Superuser only)
export function canAccessAuditLogs(user) {
  if (!user) return false;
  return isSchoolAdmin(user) || Boolean(user.is_superuser);
}

// 6. Attendance & Daily Sheet Capabilities
// Access Attendance Web Module (School Admin, Supervisor & Superuser only)
// Teacher, Secretariat, Tech Support, Guardian are 403 Forbidden
export function canAccessAttendance(user) {
  if (!user) return false;
  if (isTeacher(user) || isSecretariat(user) || isTechSupport(user) || isGuardian(user)) return false;
  return isSchoolAdmin(user) || isSupervisor(user) || Boolean(user.is_superuser);
}

// Full Attendance Management (Create, Edit, Bulk Update, Normal Departure)
export function canManageAttendance(user) {
  return canAccessAttendance(user);
}


