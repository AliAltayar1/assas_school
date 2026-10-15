import { create } from "zustand";
import { api } from "../api";
import { parseApiError } from "../utils/errorUtils";

const hasInitialSession =
  typeof window !== "undefined" &&
  localStorage.getItem("has_session") === "true";

export const useAuthStore = create((set, get) => ({
  user: null,
  permissions: [],
  requesterRole: null,
  isAuthenticated: false,
  isLoading: hasInitialSession,
  mustChangePassword: false,
  error: null,

  // Permission Helpers
  hasPermission: (permissionCode) => {
    if (!permissionCode) return false;
    const { user, requesterRole, permissions } = get();
    if (user?.is_superuser || requesterRole?.code === "superuser") return true;
    return Array.isArray(permissions) && permissions.includes(permissionCode);
  },

  hasAnyPermission: (permissionCodes = []) => {
    if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return false;
    const { user, requesterRole, permissions } = get();
    if (user?.is_superuser || requesterRole?.code === "superuser") return true;
    return permissionCodes.some((code) => permissions?.includes(code));
  },

  hasAllPermissions: (permissionCodes = []) => {
    if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return true;
    const { user, requesterRole, permissions } = get();
    if (user?.is_superuser || requesterRole?.code === "superuser") return true;
    return permissionCodes.every((code) => permissions?.includes(code));
  },

  // Refresh current user and permissions without changing loading screen
  refreshCurrentUser: async () => {
    try {
      const userData = await api.auth.getMe();
      if (userData && (userData.id || userData.username)) {
        const permissions = Array.isArray(userData.permissions)
          ? userData.permissions
          : [];
        const requesterRole =
          userData.requester_role ||
          userData._meta?.requester_role || {
            code: userData.role,
            label: userData.role_display,
          };

        set({
          user: userData,
          permissions: permissions,
          requesterRole: requesterRole,
          isAuthenticated: true,
          mustChangePassword: !!userData.must_change_password,
        });
        return userData;
      }
    } catch (_) {
      // Background refresh error handled silently
    }
  },

  // App Initialization: Verify current session via /auth/web/me/
  initialize: async () => {
    // 1. Fetch CSRF token first so forms/requests have a valid token
    try {
      await api.auth.getCsrf();
    } catch (_) {
      // Continue if CSRF fails on initial load
    }

    const hasSession =
      typeof window !== "undefined" &&
      localStorage.getItem("has_session") === "true";

    // If there is no previous session, do NOT probe /me or trigger refresh!
    if (!hasSession) {
      set({
        user: null,
        permissions: [],
        requesterRole: null,
        isAuthenticated: false,
        mustChangePassword: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // 2. Fetch authenticated user data only if a session was previously active
      const userData = await api.auth.getMe();

      if (userData && (userData.id || userData.username)) {
        const permissions = Array.isArray(userData.permissions)
          ? userData.permissions
          : [];
        const requesterRole =
          userData.requester_role ||
          userData._meta?.requester_role || {
            code: userData.role,
            label: userData.role_display,
          };

        set({
          user: userData,
          permissions: permissions,
          requesterRole: requesterRole,
          isAuthenticated: true,
          mustChangePassword: !!userData.must_change_password,
          isLoading: false,
          error: null,
        });
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("has_session");
        }
        set({
          user: null,
          permissions: [],
          requesterRole: null,
          isAuthenticated: false,
          mustChangePassword: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("has_session");
      }
      set({
        user: null,
        permissions: [],
        requesterRole: null,
        isAuthenticated: false,
        mustChangePassword: false,
        isLoading: false,
      });
    }
  },

  // Login action
  login: async (identifier, password) => {
    set({ error: null });
    try {
      // Perform backend web login
      await api.auth.login(identifier, password);

      if (typeof window !== "undefined") {
        localStorage.setItem("has_session", "true");
      }

      // Fetch user profile after successful login
      const userData = await api.auth.getMe();

      const permissions = Array.isArray(userData?.permissions)
        ? userData.permissions
        : [];
      const requesterRole =
        userData?.requester_role ||
        userData?._meta?.requester_role || {
          code: userData?.role,
          label: userData?.role_display,
        };

      set({
        user: userData,
        permissions: permissions,
        requesterRole: requesterRole,
        isAuthenticated: true,
        mustChangePassword: !!userData?.must_change_password,
        error: null,
      });

      return userData;
    } catch (err) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("has_session");
      }
      const status = err.response?.status;
      let errorMessage = "حدث خطأ أثناء تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مجدداً.";

      if (status === 429) {
        errorMessage = "تم تجاوز عدد محاولات الدخول المسموح بها (5 محاولات/دقيقة). يرجى الانتظار قليلاً ثم المحاولة.";
      } else {
        errorMessage = parseApiError(
          err,
          "اسم المستخدم أو كلمة المرور غير صحيحة."
        );
      }

      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Change password for logged in user (Handles temporary password flow)
  changePassword: async (currentPassword, newPassword, newPasswordConfirm) => {
    set({ error: null });
    try {
      await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });

      // Refetch me to update must_change_password flag & permissions
      const updatedUser = await api.auth.getMe();

      const permissions = Array.isArray(updatedUser?.permissions)
        ? updatedUser.permissions
        : [];
      const requesterRole =
        updatedUser?.requester_role ||
        updatedUser?._meta?.requester_role || {
          code: updatedUser?.role,
          label: updatedUser?.role_display,
        };

      set({
        user: updatedUser,
        permissions: permissions,
        requesterRole: requesterRole,
        mustChangePassword: !!updatedUser?.must_change_password,
        error: null,
      });

      return updatedUser;
    } catch (err) {
      const errorMessage = parseApiError(
        err,
        "فشل تغيير كلمة المرور. يرجى التأكد من تطابق كلمة المرور ومخالفتها للكلمة القديمة."
      );
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Logout action
  logout: async () => {
    try {
      await api.auth.logout();
    } catch (_) {
      // Ignore session expiration errors on logout
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("has_session");
    }

    set({
      user: null,
      permissions: [],
      requesterRole: null,
      isAuthenticated: false,
      mustChangePassword: false,
      error: null,
    });
  },

  // Update personal user profile (first_name, last_name, email)
  updateProfile: async (profileData) => {
    set({ error: null });
    try {
      const updatedUser = await api.auth.updateMe({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
      });

      set({
        user: updatedUser,
        error: null,
      });

      return updatedUser;
    } catch (err) {
      const errorMessage = parseApiError(err, "فشل تحديث البيانات الشخصية.");
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Clear errors
  clearError: () => set({ error: null }),
}));

// Listen for global session expiry events from Axios interceptor
if (typeof window !== "undefined") {
  window.addEventListener("auth-session-expired", () => {
    const wasAuthenticated = useAuthStore.getState().isAuthenticated;
    localStorage.removeItem("has_session");
    useAuthStore.setState({
      user: null,
      permissions: [],
      requesterRole: null,
      isAuthenticated: false,
      mustChangePassword: false,
      error: wasAuthenticated
        ? "انتهت مدة الجلسة الحالية. يرجى تسجيل الدخول مجدداً."
        : null,
    });
  });

  // Listen for backend business permission denied to immediately refresh permissions
  window.addEventListener("business-permission-denied", () => {
    useAuthStore.getState().refreshCurrentUser();
  });
}
