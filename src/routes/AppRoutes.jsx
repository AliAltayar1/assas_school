import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, normalizeRole } from './ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';

// Lazy-loaded route components for optimized chunking and fast initial load
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));

const AdminOverview = lazy(() => import('../pages/admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const UserStaffManagement = lazy(() => import('../pages/admin/UserStaffManagement').then(m => ({ default: m.UserStaffManagement })));
const AcademicManagement = lazy(() => import('../pages/admin/AcademicManagement').then(m => ({ default: m.AcademicManagement })));
const TeacherManagement = lazy(() => import('../pages/admin/TeacherManagement').then(m => ({ default: m.TeacherManagement })));
const StudentManagement = lazy(() => import('../pages/admin/StudentManagement').then(m => ({ default: m.StudentManagement })));
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

  const getHomeRouteForRole = (userObj) => {
    const rawRole = userObj?.role || userObj?.role_code || userObj?.role_name || '';
    const role = normalizeRole(rawRole);
    if (role === 'school_admin') return '/admin';
    if (role === 'secretariat') return '/secretariat';
    if (role === 'supervisor') return '/supervisor';
    if (role === 'teacher') return '/teacher';
    return '/admin';
  };

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
            {/* 1. School Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['school_admin', 'admin']} />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/statistics" element={<AdminOverview />} />
              <Route path="/admin/academics" element={<AcademicManagement />} />
              <Route path="/admin/users" element={<UserStaffManagement />} />
              <Route path="/admin/teachers" element={<TeacherManagement />} />
              <Route path="/admin/assignments" element={<TeacherManagement />} />
              <Route path="/admin/students" element={<StudentManagement />} />
              <Route path="/admin/behavior" element={<BehaviorManagement />} />
              <Route path="/admin/homework" element={<HomeworkManagement />} />
              <Route path="/admin/announcements" element={<AnnouncementManagement />} />
              <Route path="/admin/requests" element={<RequestManagement />} />
              <Route path="/admin/appointments" element={<AppointmentManagement />} />
              <Route path="/admin/financials" element={<FinanceManagement />} />
              {/* Fallbacks & Management */}
              <Route path="/admin/attendance" element={<AttendanceManagement />} />
              <Route path="/admin/grades" element={<GradesManagement />} />
              <Route path="/admin/audit-logs" element={<AuditLogManagement />} />
              <Route path="/admin/reports" element={<AuditLogManagement />} />
            </Route>

            {/* 2. Secretariat Routes */}
            <Route element={<ProtectedRoute allowedRoles={['secretariat', 'secretary', 'school_admin', 'admin']} />}>
              <Route path="/secretariat" element={<SecretariatOverview />} />
              <Route path="/secretariat/statistics" element={<SecretariatOverview />} />
              <Route path="/secretariat/students" element={<StudentManagement />} />
              <Route path="/secretariat/academics" element={<AcademicManagement />} />
              <Route path="/secretariat/behavior" element={<BehaviorManagement />} />
              <Route path="/secretariat/announcements" element={<AnnouncementManagement />} />
              <Route path="/secretariat/requests" element={<RequestManagement />} />
              <Route path="/secretariat/appointments" element={<AppointmentManagement />} />
              <Route path="/secretariat/payments" element={<FinanceManagement />} />
              <Route path="/secretariat/excel-import" element={<SecretariatOverview />} />
            </Route>

            {/* 3. Supervisor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['supervisor', 'educational_supervisor', 'school_admin', 'admin']} />}>
              <Route path="/supervisor" element={<SupervisorOverview />} />
              <Route path="/supervisor/attendance" element={<AttendanceManagement />} />
              <Route path="/supervisor/attendance-approvals" element={<Navigate to="/supervisor/attendance" replace />} />
              <Route path="/supervisor/teaching-assignments" element={<TeacherManagement />} />
              <Route path="/supervisor/students" element={<StudentManagement />} />
              <Route path="/supervisor/academics" element={<AcademicManagement />} />
              <Route path="/supervisor/behavior-notes" element={<BehaviorManagement />} />
              <Route path="/supervisor/behavior" element={<BehaviorManagement />} />
              <Route path="/supervisor/homework" element={<HomeworkManagement />} />
              <Route path="/supervisor/announcements" element={<AnnouncementManagement />} />
              <Route path="/supervisor/requests" element={<RequestManagement />} />
              <Route path="/supervisor/grade-approvals" element={<GradesManagement />} />
            </Route>

            {/* 4. Teacher Routes */}
            <Route element={<ProtectedRoute allowedRoles={['teacher', 'school_admin', 'admin']} />}>
              <Route path="/teacher" element={<TeacherOverview />} />
              <Route path="/teacher/assignments" element={<TeacherManagement />} />
              <Route path="/teacher/students" element={<StudentManagement />} />
              <Route path="/teacher/grades" element={<GradesManagement />} />
              <Route path="/teacher/homework" element={<HomeworkManagement />} />
              <Route path="/teacher/announcements" element={<AnnouncementManagement />} />
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
