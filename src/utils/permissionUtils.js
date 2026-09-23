/**
 * Permission Utilities for Asas School Platform.
 * Enforces permission-based visibility and actions across the application.
 */

import { useAuthStore } from "../store/useAuthStore";
import { useCallback } from "react";

// ==========================================
// 1. Module Permission Constant Arrays
// ==========================================

export const ACADEMICS_PERMISSIONS = [
  "academics.view_academicyear",
  "academics.add_academicyear",
  "academics.change_academicyear",
  "academics.delete_academicyear",
  "academics.view_term",
  "academics.add_term",
  "academics.change_term",
  "academics.delete_term",
  "academics.view_gradelevel",
  "academics.add_gradelevel",
  "academics.change_gradelevel",
  "academics.delete_gradelevel",
  "academics.view_section",
  "academics.add_section",
  "academics.change_section",
  "academics.delete_section",
  "academics.view_subject",
  "academics.add_subject",
  "academics.change_subject",
  "academics.delete_subject",
  "academics.view_gradesubject",
  "academics.add_gradesubject",
  "academics.change_gradesubject",
  "academics.delete_gradesubject",
];

export const TEACHING_PERMISSIONS = [
  "teaching.view_teacherassignment",
  "teaching.add_teacherassignment",
  "teaching.change_teacherassignment",
  "teaching.delete_teacherassignment",
];

export const STUDENT_PERMISSIONS = [
  "students.view_student",
  "students.add_student",
  "students.change_student",
  "students.delete_student",
  "students.register_student",
  "students.view_student_profile",
  "students.view_studenthealthprofile",
  "students.change_studenthealthprofile",
  "students.view_guardianstudent",
  "students.add_guardianstudent",
  "students.delete_guardianstudent",
  "students.view_enrollment",
  "students.add_enrollment",
  "students.change_enrollment",
  "students.transfer_student",
  "students.delete_enrollment",
];

export const ATTENDANCE_PERMISSIONS = [
  "attendance.view_attendancesheet",
  "attendance.add_attendancesheet",
  "attendance.change_attendancesheet",
  "attendance.view_attendancerecord",
  "attendance.change_attendancerecord",
];

export const BEHAVIOR_PERMISSIONS = [
  "behavior.view_behaviornote",
  "behavior.add_behaviornote",
  "behavior.change_behaviornote",
  "behavior.delete_behaviornote",
];

export const HOMEWORK_PERMISSIONS = [
  "homework.view_homework",
  "homework.add_homework",
  "homework.change_homework",
  "homework.delete_homework",
];

export const ANNOUNCEMENT_PERMISSIONS = [
  "announcements.view_announcement",
  "announcements.add_announcement",
  "announcements.change_announcement",
  "announcements.delete_announcement",
];

export const REQUEST_PERMISSIONS = [
  "school_requests.view_schoolrequest",
  "school_requests.reply_to_request",
];

export const APPOINTMENT_PERMISSIONS = [
  "appointments.view_appointmentrequest",
  "appointments.decide_appointment_request",
];

export const FINANCE_PERMISSIONS = [
  "finance.view_gradetuitionplan",
  "finance.add_gradetuitionplan",
  "finance.change_gradetuitionplan",
  "finance.view_studentfinancialaccount",
  "finance.add_payment",
  "finance.cancel_payment",
  "finance.add_studentdiscount",
  "finance.cancel_discount",
];

export const GRADES_PERMISSIONS = [
  "grades.view_assessment",
  "grades.add_assessment",
  "grades.change_assessment",
  "grades.delete_assessment",
  "grades.create_grade_wide_assessment",
  "grades.view_studentscore",
  "grades.change_studentscore",
  "grades.publish_grades",
  "grades.correct_published_grades",
];

export const AUDIT_LOG_PERMISSIONS = [
  "audit_logs.view_auditlog",
];

export const USER_PERMISSIONS = [
  "accounts.view_user",
  "accounts.add_user",
  "accounts.change_user",
  "accounts.set_user_active",
  "accounts.reset_user_password",
  "accounts.manage_user_permissions",
];

// ==========================================
// 2. Central Permission Check Helpers
// ==========================================

export function hasPermission(permissionCode) {
  if (!permissionCode) return false;
  const state = useAuthStore.getState();
  if (state.user?.is_superuser || state.requesterRole?.code === "superuser") return true;
  return Array.isArray(state.permissions) && state.permissions.includes(permissionCode);
}

export function hasAnyPermission(permissionCodes = []) {
  if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return false;
  const state = useAuthStore.getState();
  if (state.user?.is_superuser || state.requesterRole?.code === "superuser") return true;
  return permissionCodes.some((code) => state.permissions?.includes(code));
}

export function hasAllPermissions(permissionCodes = []) {
  if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return true;
  const state = useAuthStore.getState();
  if (state.user?.is_superuser || state.requesterRole?.code === "superuser") return true;
  return permissionCodes.every((code) => state.permissions?.includes(code));
}

/**
 * Security Rule for Permission Management:
 * Only Superuser OR (role === 'school_admin' AND has 'accounts.manage_user_permissions')
 */
export function canManagePermissions(user, requesterRole, permissions) {
  const isSuperuser = Boolean(
    user?.is_superuser ||
    requesterRole?.code === "superuser" ||
    (typeof window !== "undefined" && useAuthStore.getState().requesterRole?.code === "superuser")
  );
  if (isSuperuser) return true;

  const currentRole = (
    user?.role ||
    requesterRole?.code ||
    (typeof window !== "undefined" && useAuthStore.getState().user?.role) ||
    ""
  ).toLowerCase();

  const userPerms =
    permissions ||
    user?.permissions ||
    (typeof window !== "undefined" && useAuthStore.getState().permissions) ||
    [];

  const isSchoolAdminRole = currentRole === "school_admin" || currentRole === "admin";
  const hasManagePerm = Array.isArray(userPerms) && userPerms.includes("accounts.manage_user_permissions");

  return isSchoolAdminRole && hasManagePerm;
}

/**
 * Security Rule for Student Comprehensive Profile:
 * Only Superuser OR (role in ['school_admin', 'secretariat', 'supervisor'] AND has 'students.view_student_profile')
 * Forbidden for: teacher, guardian, tech_support
 */
export function canViewStudentProfile(user, requesterRole, permissions) {
  const isSuperuser = Boolean(
    user?.is_superuser ||
    requesterRole?.code === "superuser" ||
    (typeof window !== "undefined" && useAuthStore.getState().requesterRole?.code === "superuser")
  );
  if (isSuperuser) return true;

  const rawRole = (
    user?.role ||
    user?.role_code ||
    requesterRole?.code ||
    (typeof window !== "undefined" && (useAuthStore.getState().user?.role || useAuthStore.getState().requesterRole?.code)) ||
    ""
  ).toLowerCase().replace(/[\s-]+/g, "_");

  const normalizedRole =
    rawRole === "admin" || rawRole === "school_admin" || rawRole === "schooladmin"
      ? "school_admin"
      : rawRole === "secretary" || rawRole === "secretariat"
      ? "secretariat"
      : rawRole === "educational_supervisor" || rawRole === "supervisor"
      ? "supervisor"
      : rawRole;

  const allowedRoles = ["school_admin", "secretariat", "supervisor"];
  if (!allowedRoles.includes(normalizedRole)) return false;

  const userPerms =
    permissions ||
    user?.permissions ||
    (typeof window !== "undefined" && useAuthStore.getState().permissions) ||
    [];

  return Array.isArray(userPerms) && userPerms.includes("students.view_student_profile");
}

/**
 * Security Rule for Correcting Published Grades:
 * - Forbidden for teachers (even if assigned the permission directly).
 * - Allowed for Superuser, or users (school_admin, supervisor within scope) with 'grades.correct_published_grades'.
 */
export function canCorrectPublishedGrades(user, requesterRole, permissions) {
  const isSuper = Boolean(
    user?.is_superuser ||
    requesterRole?.code === "superuser" ||
    (typeof window !== "undefined" && useAuthStore.getState().requesterRole?.code === "superuser")
  );
  if (isSuper) return true;

  const rawRole = (
    user?.role ||
    user?.role_code ||
    requesterRole?.code ||
    (typeof window !== "undefined" && (useAuthStore.getState().user?.role || useAuthStore.getState().requesterRole?.code)) ||
    ""
  ).toLowerCase().replace(/[\s-]+/g, "_");

  const normalizedRole = normalizeRole(rawRole);
  // Teacher is strictly forbidden from correcting published grades
  if (normalizedRole === "teacher") return false;

  const userPerms =
    permissions ||
    user?.permissions ||
    (typeof window !== "undefined" && useAuthStore.getState().permissions) ||
    [];

  return Array.isArray(userPerms) && userPerms.includes("grades.correct_published_grades");
}

// ==========================================
// 3. React Hook for Reactive Permission Checking
// ==========================================

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions) || [];
  const user = useAuthStore((s) => s.user);
  const requesterRole = useAuthStore((s) => s.requesterRole);
  const isSuperuser = Boolean(user?.is_superuser || requesterRole?.code === "superuser");

  const checkHasPermission = useCallback(
    (perm) => {
      if (isSuperuser) return true;
      return permissions.includes(perm);
    },
    [permissions, isSuperuser]
  );

  const checkHasAnyPermission = useCallback(
    (perms = []) => {
      if (isSuperuser) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [permissions, isSuperuser]
  );

  const checkHasAllPermissions = useCallback(
    (perms = []) => {
      if (isSuperuser) return true;
      return perms.every((p) => permissions.includes(p));
    },
    [permissions, isSuperuser]
  );

  const canManageUserPerms = canManagePermissions(user, requesterRole, permissions);
  const canViewProfile = canViewStudentProfile(user, requesterRole, permissions);
  const canCorrectGrades = canCorrectPublishedGrades(user, requesterRole, permissions);

  const role = normalizeRole(user?.role || requesterRole?.code);
  const isAccountantRole = role === "accountant";

  return {
    permissions,
    hasPermission: checkHasPermission,
    hasAnyPermission: checkHasAnyPermission,
    hasAllPermissions: checkHasAllPermissions,
    canManagePermissions: canManageUserPerms,
    canViewStudentProfile: canViewProfile,
    canCorrectPublishedGrades: canCorrectGrades,
    isAccountant: isAccountantRole,
    isSuperuser,
  };
}

// ==========================================
// 4. Role Identifiers (For UI, Badges & Data Scope)
// ==========================================

export function normalizeRole(role) {
  if (!role) return "";
  const clean = String(role).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (clean === "admin" || clean === "school_admin" || clean === "schooladmin") return "school_admin";
  if (clean === "secretary" || clean === "secretariat") return "secretariat";
  if (clean === "educational_supervisor" || clean === "supervisor") return "supervisor";
  if (clean === "teacher") return "teacher";
  if (clean === "guardian" || clean === "parent") return "guardian";
  if (clean === "accountant") return "accountant";
  return clean;
}

export function getHomeRouteForRole(userObj) {
  const rawRole = userObj?.role || userObj?.role_code || userObj?.role_name || "";
  const role = normalizeRole(rawRole);
  if (role === "school_admin") return "/admin";
  if (role === "secretariat") return "/secretariat";
  if (role === "supervisor") return "/supervisor";
  if (role === "teacher") return "/teacher";
  if (role === "accountant") return "/accountant/financials";
  return "/admin";
}

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

export function isAccountant(user) {
  const role = getUserRole(user);
  return role === "accountant";
}

export function isAdministrativeRole(user) {
  return isSchoolAdmin(user) || isSecretariat(user) || isSupervisor(user);
}

// ==========================================
// 5. Backwards-Compatible Capability Checks (Upgraded to Permissions)
// ==========================================

export function canManageAcademics() {
  return hasAnyPermission(ACADEMICS_PERMISSIONS);
}

export function canManageStudents() {
  return hasAnyPermission(STUDENT_PERMISSIONS);
}

export function canManageTeachingAssignments() {
  return hasAnyPermission(TEACHING_PERMISSIONS);
}

export function canManageUsers() {
  return hasAnyPermission(USER_PERMISSIONS);
}

export function canManageSchoolRequests() {
  return hasAnyPermission(REQUEST_PERMISSIONS);
}

export function canAccessFinance() {
  return hasAnyPermission(FINANCE_PERMISSIONS);
}

export function canManageTuitionPlans() {
  return hasAnyPermission([
    "finance.add_gradetuitionplan",
    "finance.change_gradetuitionplan",
  ]);
}

export function canManageDiscounts() {
  return hasAnyPermission([
    "finance.add_studentdiscount",
    "finance.cancel_discount",
  ]);
}

export function canCancelFinanceTransactions() {
  return hasAnyPermission([
    "finance.cancel_payment",
    "finance.cancel_discount",
  ]);
}

export function canRecordPayments() {
  return hasPermission("finance.add_payment");
}

export function canPreviewRemainingSyp() {
  return hasPermission("finance.view_studentfinancialaccount");
}

export function canAccessAppointments() {
  return hasAnyPermission(APPOINTMENT_PERMISSIONS);
}

export function canDecideAppointments() {
  return hasPermission("appointments.decide_appointment_request");
}

export function canMutateData() {
  return hasAnyPermission([
    "students.add_student",
    "students.change_student",
    "students.delete_student",
    "teaching.add_teacherassignment",
    "teaching.change_teacherassignment",
    "teaching.delete_teacherassignment",
    ...ACADEMICS_PERMISSIONS.filter((p) => p.includes("add_") || p.includes("change_") || p.includes("delete_")),
  ]);
}

export function canAccessGrades() {
  return hasAnyPermission(GRADES_PERMISSIONS);
}

export function canPublishGrades() {
  return hasPermission("grades.publish_grades");
}

export function canCreateAssessmentForGrade() {
  return hasPermission("grades.create_grade_wide_assessment");
}

export function canEnterGrades() {
  return hasPermission("grades.change_studentscore");
}

export function canAccessAuditLogs() {
  return hasPermission("audit_logs.view_auditlog");
}

export function canAccessAttendance() {
  return hasAnyPermission(ATTENDANCE_PERMISSIONS);
}

export function canManageAttendance() {
  return hasAnyPermission([
    "attendance.add_attendancesheet",
    "attendance.change_attendancesheet",
    "attendance.change_attendancerecord",
  ]);
}


