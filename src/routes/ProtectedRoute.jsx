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
  if (clean === 'accountant') return 'accountant';
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

export function ProtectedRoute({
  allowedRoles = [],
  requiredPermissions = [],
  requiredAnyPermission = [],
}) {
  const {
    isAuthenticated,
    isLoading,
    mustChangePassword,
    user,
    requesterRole,
    permissions,
  } = useAuthStore();
  const location = useLocation();

  // 1. App initialization loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white dir-rtl"
        dir="rtl"
      >
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">
          جاري التحقق من الجلسة والصلاحيات...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated check
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Forced Temporary Password Change Flow Enforcement
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // 4. Superuser Full Bypass
  const isSuperuser = Boolean(
    user?.is_superuser || requesterRole?.code === "superuser"
  );
  if (isSuperuser) {
    return <Outlet />;
  }

  const userPerms = Array.isArray(permissions) ? permissions : [];
  const homeRoute = getHomeRouteForRole(user);

  // 5. Check All Required Permissions
  if (requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every((perm) =>
      userPerms.includes(perm)
    );
    if (!hasAll) {
      if (location.pathname === homeRoute) return <Outlet />;
      return <Navigate to={homeRoute} replace />;
    }
  }

  // 6. Check Any Required Permission
  if (requiredAnyPermission.length > 0) {
    const hasAny = requiredAnyPermission.some((perm) =>
      userPerms.includes(perm)
    );
    if (!hasAny) {
      if (location.pathname === homeRoute) return <Outlet />;
      return <Navigate to={homeRoute} replace />;
    }
  }

  // 7. Role Authorization Check (For specific Overviews like Dashboard Overview)
  if (allowedRoles.length > 0 && user) {
    const rawRole = user.role || user.role_code || user.role_name || "";
    const userRole = normalizeRole(rawRole);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    if (userRole && !normalizedAllowed.includes(userRole)) {
      if (location.pathname === homeRoute) {
        return <Outlet />;
      }
      return <Navigate to={homeRoute} replace />;
    }
  }

  return <Outlet />;
}
