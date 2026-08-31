import { create } from "zustand";
import { api } from "../api";
import { parseApiError } from "../utils/errorUtils";

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  mustChangePassword: false,
  error: null,

  // App Initialization: Verify current session via /auth/web/me/
  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      // 1. Fetch CSRF token first
      try {
        await api.auth.getCsrf();
      } catch (_) {
        // Continue if CSRF fails on initial load
      }

      // 2. Fetch authenticated user data
      const userData = await api.auth.getMe();

      if (userData && (userData.id || userData.username)) {
        set({
          user: userData,
          isAuthenticated: true,
          mustChangePassword: !!userData.must_change_password,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          mustChangePassword: false,
          isLoading: false,
        });
      }
    } catch (err) {
      set({
        user: null,
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

      // Fetch user profile after successful login
      const userData = await api.auth.getMe();

      set({
        user: userData,
        isAuthenticated: true,
        mustChangePassword: !!userData?.must_change_password,
        error: null,
      });

      return userData;
    } catch (err) {
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

      // Refetch me to update must_change_password flag
      const updatedUser = await api.auth.getMe();

      set({
        user: updatedUser,
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

    set({
      user: null,
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
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,
      error: "انتهت مدة الجلسة الحالية. يرجى تسجيل الدخول مجدداً.",
    });
  });
}
