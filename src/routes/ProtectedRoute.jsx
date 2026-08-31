import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Loader2 } from 'lucide-react';

/**
 * Normalizes user role string to standard identifiers
 */
export function normalizeRole(role) {
  if (!role) return '';
  const clean = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (clean === 'admin' || clean === 'school_admin' || clean === 'schooladmin') return 'school_admin';
  if (clean === 'secretary' || clean === 'secretariat') return 'secretariat';
  if (clean === 'educational_supervisor' || clean === 'supervisor') return 'supervisor';
  if (clean === 'teacher') return 'teacher';
  if (clean === 'guardian' || clean === 'parent') return 'guardian';
  return clean;
}

export function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, isLoading, mustChangePassword, user } = useAuthStore();
  const location = useLocation();

  // 1. App initialization loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white dir-rtl" dir="rtl">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">جاري التحقق من الجلسة والصلاحيات...</p>
      </div>
    );
  }

  // 2. Unauthenticated check
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Forced Temporary Password Change Flow Enforcement
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // 4. Role Authorization Check
  if (allowedRoles.length > 0 && user) {
    const rawRole = user.role || user.role_code || user.role_name || '';
    const userRole = normalizeRole(rawRole);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    // If user is school_admin, allow full administrative access
    if (userRole === 'school_admin') {
      return <Outlet />;
    }

    if (userRole && !normalizedAllowed.includes(userRole)) {
      const roleRoutes = {
        school_admin: '/admin',
        secretariat: '/secretariat',
        supervisor: '/supervisor',
        teacher: '/teacher',
      };

      const redirectPath = roleRoutes[userRole] || '/admin';

      // Avoid infinite redirect loop
      if (location.pathname === redirectPath) {
        return <Outlet />;
      }

      return <Navigate to={redirectPath} replace />;
    }
  }

  return <Outlet />;
}
