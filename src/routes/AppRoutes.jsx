import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, getHomeRouteForRole } from './ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import {
  ACADEMICS_PERMISSIONS,
  TEACHING_PERMISSIONS,
  STUDENT_PERMISSIONS,
  ATTENDANCE_PERMISSIONS,
  BEHAVIOR_PERMISSIONS,
  HOMEWORK_PERMISSIONS,
  ANNOUNCEMENT_PERMISSIONS,
  REQUEST_PERMISSIONS,
  APPOINTMENT_PERMISSIONS,
  FINANCE_PERMISSIONS,
  GRADES_PERMISSIONS,
  AUDIT_LOG_PERMISSIONS,
  USER_PERMISSIONS,
} from '../utils/permissionUtils';

// Lazy-loaded route components for optimized chunking and fast initial load
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));

const AdminOverview = lazy(() => import('../pages/admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const UserStaffManagement = lazy(() => import('../pages/admin/UserStaffManagement').then(m => ({ default: m.UserStaffManagement })));
const AcademicManagement = lazy(() => import('../pages/admin/AcademicManagement').then(m => ({ default: m.AcademicManagement })));
const TeacherManagement = lazy(() => import('../pages/admin/TeacherManagement').then(m => ({ default: m.TeacherManagement })));
const StudentManagement = lazy(() => import('../pages/admin/StudentManagement').then(m => ({ default: m.StudentManagement })));
const StudentProfilePage = lazy(() => import('../pages/students/StudentProfilePage').then(m => ({ default: m.StudentProfilePage })));
const BehaviorManagement = lazy(() => import('../pages/admin/BehaviorManagement').then(m => ({ default: m.BehaviorManagement })));
const HomeworkManagement = lazy(() => import('../pages/admin/HomeworkManagement').then(m => ({ default: m.HomeworkManagement })));
const AnnouncementManagement = lazy(() => import('../pages/admin/AnnouncementManagement').then(m => ({ default: m.AnnouncementManagement })));
const RequestManagement = lazy(() => import('../pages/admin/RequestManagement').then(m => ({ default: m.RequestManagement })));
const AppointmentManagement = lazy(() => import('../pages/admin/AppointmentManagement').then(m => ({ default: m.AppointmentManagement })));
const FinanceManagement = lazy(() => import('../pages/admin/FinanceManagement').then(m => ({ default: m.FinanceManagement })));
const GradesManagement = lazy(() => import('../pages/admin/GradesManagement').then(m => ({ default: m.GradesManagement })));
const AuditLogManagement = lazy(() => import('../pages/admin/AuditLogManagement').then(m => ({ default: m.AuditLogManagement })));
const AttendanceManagement = lazy(() => import('../pages/admin/AttendanceManagement').then(m => ({ default: m.AttendanceManagement })));

const SecretariatOverview = lazy(() => import('../pages/secretariat/SecretariatOverview').then(m => ({ default: m.SecretariatOverview })));
const SupervisorOverview = lazy(() => import('../pages/supervisor/SupervisorOverview').then(m => ({ default: m.SupervisorOverview })));
const TeacherOverview = lazy(() => import('../pages/teacher/TeacherOverview').then(m => ({ default: m.TeacherOverview })));

function PageLoader() {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 p-8">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
      <p className="text-xs font-medium text-slate-500">جاري تحميل الصفحة...</p>
    </div>
  );
}

export function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={getHomeRouteForRole(user)} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Standalone Forced Password Change Route */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        {/* Authenticated Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* 1. Dashboard Overviews (Role-based guards preserved as per specifications) */}
            <Route element={<ProtectedRoute allowedRoles={['school_admin', 'admin']} />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/statistics" element={<AdminOverview />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['secretariat', 'secretary', 'school_admin', 'admin']} />}>
              <Route path="/secretariat" element={<SecretariatOverview />} />
              <Route path="/secretariat/statistics" element={<SecretariatOverview />} />
              <Route path="/secretariat/excel-import" element={<SecretariatOverview />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['supervisor', 'educational_supervisor', 'school_admin', 'admin']} />}>
              <Route path="/supervisor" element={<SupervisorOverview />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['teacher', 'school_admin', 'admin']} />}>
              <Route path="/teacher" element={<TeacherOverview />} />
            </Route>

            {/* 2. Business Permission-Guarded Modules */}
            {/* Accounts & Users Management */}
            <Route element={<ProtectedRoute requiredAnyPermission={USER_PERMISSIONS} />}>
              <Route path="/admin/users" element={<UserStaffManagement />} />
              <Route path="/secretariat/users" element={<UserStaffManagement />} />
              <Route path="/supervisor/users" element={<UserStaffManagement />} />
              <Route path="/teacher/users" element={<UserStaffManagement />} />
            </Route>

            {/* Academics Structure */}
            <Route element={<ProtectedRoute requiredAnyPermission={ACADEMICS_PERMISSIONS} />}>
              <Route path="/admin/academics" element={<AcademicManagement />} />
              <Route path="/secretariat/academics" element={<AcademicManagement />} />
              <Route path="/supervisor/academics" element={<AcademicManagement />} />
              <Route path="/teacher/academics" element={<AcademicManagement />} />
            </Route>

            {/* Teaching Assignments */}
            <Route element={<ProtectedRoute requiredAnyPermission={TEACHING_PERMISSIONS} />}>
              <Route path="/admin/teachers" element={<TeacherManagement />} />
              <Route path="/admin/assignments" element={<TeacherManagement />} />
              <Route path="/secretariat/teachers" element={<TeacherManagement />} />
              <Route path="/secretariat/assignments" element={<TeacherManagement />} />
              <Route path="/supervisor/teaching-assignments" element={<TeacherManagement />} />
              <Route path="/supervisor/assignments" element={<TeacherManagement />} />
              <Route path="/teacher/assignments" element={<TeacherManagement />} />
            </Route>

            {/* Students & Enrollments */}
            <Route element={<ProtectedRoute requiredAnyPermission={STUDENT_PERMISSIONS} />}>
              <Route path="/admin/students" element={<StudentManagement />} />
              <Route path="/secretariat/students" element={<StudentManagement />} />
              <Route path="/supervisor/students" element={<StudentManagement />} />
              <Route path="/teacher/students" element={<StudentManagement />} />
            </Route>

            {/* Student Comprehensive Profile (Restricted to School Admin, Secretariat, Supervisor, Superuser with students.view_student_profile) */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={['school_admin', 'admin', 'secretariat', 'secretary', 'supervisor', 'educational_supervisor']}
                  requiredPermissions={['students.view_student_profile']}
                />
              }
            >
              <Route path="/admin/students/:studentId/profile" element={<StudentProfilePage />} />
              <Route path="/secretariat/students/:studentId/profile" element={<StudentProfilePage />} />
              <Route path="/supervisor/students/:studentId/profile" element={<StudentProfilePage />} />
            </Route>

            {/* Daily Attendance */}
            <Route element={<ProtectedRoute requiredAnyPermission={ATTENDANCE_PERMISSIONS} />}>
              <Route path="/admin/attendance" element={<AttendanceManagement />} />
              <Route path="/secretariat/attendance" element={<AttendanceManagement />} />
              <Route path="/supervisor/attendance" element={<AttendanceManagement />} />
              <Route path="/supervisor/attendance-approvals" element={<Navigate to="/supervisor/attendance" replace />} />
              <Route path="/teacher/attendance" element={<AttendanceManagement />} />
            </Route>

            {/* Behavior Notes */}
            <Route element={<ProtectedRoute requiredAnyPermission={BEHAVIOR_PERMISSIONS} />}>
              <Route path="/admin/behavior" element={<BehaviorManagement />} />
              <Route path="/secretariat/behavior" element={<BehaviorManagement />} />
              <Route path="/supervisor/behavior" element={<BehaviorManagement />} />
              <Route path="/supervisor/behavior-notes" element={<BehaviorManagement />} />
              <Route path="/teacher/behavior" element={<BehaviorManagement />} />
            </Route>

            {/* Daily Homework */}
            <Route element={<ProtectedRoute requiredAnyPermission={HOMEWORK_PERMISSIONS} />}>
              <Route path="/admin/homework" element={<HomeworkManagement />} />
              <Route path="/secretariat/homework" element={<HomeworkManagement />} />
              <Route path="/supervisor/homework" element={<HomeworkManagement />} />
              <Route path="/teacher/homework" element={<HomeworkManagement />} />
            </Route>

            {/* Announcements */}
            <Route element={<ProtectedRoute requiredAnyPermission={ANNOUNCEMENT_PERMISSIONS} />}>
              <Route path="/admin/announcements" element={<AnnouncementManagement />} />
              <Route path="/secretariat/announcements" element={<AnnouncementManagement />} />
              <Route path="/supervisor/announcements" element={<AnnouncementManagement />} />
              <Route path="/teacher/announcements" element={<AnnouncementManagement />} />
            </Route>

            {/* School Requests */}
            <Route element={<ProtectedRoute requiredAnyPermission={REQUEST_PERMISSIONS} />}>
              <Route path="/admin/requests" element={<RequestManagement />} />
              <Route path="/secretariat/requests" element={<RequestManagement />} />
              <Route path="/supervisor/requests" element={<RequestManagement />} />
              <Route path="/teacher/requests" element={<RequestManagement />} />
            </Route>

            {/* Appointments */}
            <Route element={<ProtectedRoute requiredAnyPermission={APPOINTMENT_PERMISSIONS} />}>
              <Route path="/admin/appointments" element={<AppointmentManagement />} />
              <Route path="/secretariat/appointments" element={<AppointmentManagement />} />
              <Route path="/supervisor/appointments" element={<AppointmentManagement />} />
              <Route path="/teacher/appointments" element={<AppointmentManagement />} />
              <Route path="/accountant/appointments" element={<AppointmentManagement />} />
            </Route>

            {/* Finance & Accounts */}
            <Route element={<ProtectedRoute requiredAnyPermission={FINANCE_PERMISSIONS} />}>
              <Route path="/admin/financials" element={<FinanceManagement />} />
              <Route path="/secretariat/payments" element={<FinanceManagement />} />
              <Route path="/secretariat/financials" element={<FinanceManagement />} />
              <Route path="/supervisor/financials" element={<FinanceManagement />} />
              <Route path="/teacher/financials" element={<FinanceManagement />} />
              <Route path="/accountant/financials" element={<FinanceManagement />} />
              <Route path="/accountant" element={<Navigate to="/accountant/financials" replace />} />
            </Route>

            {/* Grades & Assessments */}
            <Route element={<ProtectedRoute requiredAnyPermission={GRADES_PERMISSIONS} />}>
              <Route path="/admin/grades" element={<GradesManagement />} />
              <Route path="/secretariat/grades" element={<GradesManagement />} />
              <Route path="/supervisor/grades" element={<GradesManagement />} />
              <Route path="/supervisor/grade-approvals" element={<GradesManagement />} />
              <Route path="/teacher/grades" element={<GradesManagement />} />
            </Route>

            {/* Audit Logs */}
            <Route element={<ProtectedRoute requiredAnyPermission={AUDIT_LOG_PERMISSIONS} />}>
              <Route path="/admin/audit-logs" element={<AuditLogManagement />} />
              <Route path="/admin/reports" element={<AuditLogManagement />} />
              <Route path="/secretariat/audit-logs" element={<AuditLogManagement />} />
              <Route path="/supervisor/audit-logs" element={<AuditLogManagement />} />
              <Route path="/teacher/audit-logs" element={<AuditLogManagement />} />
              <Route path="/accountant/audit-logs" element={<AuditLogManagement />} />
            </Route>
          </Route>
        </Route>

        {/* Default Catch-all Fallback */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate to={getHomeRouteForRole(user)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Suspense>
  );
}
