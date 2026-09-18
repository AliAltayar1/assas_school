import axios from "axios";
import { API_CONFIG } from "./config";
import { parseApiError } from "../utils/errorUtils";

let activeCsrfToken = null;

export const setCsrfToken = (token) => {
  activeCsrfToken = token;
};

export const getStoredCsrfToken = () => activeCsrfToken;

export const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

export const refreshInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

/**
 * Logs API errors directly and clearly to the browser console.
 * Shows status, method, url, human-readable parsed message, and raw backend response data.
 */
function logApiError(error) {
  if (!error) return;
  const status = error.response?.status;
  const method = error.config?.method?.toUpperCase() || "REQUEST";
  const url = error.config?.url || "unknown";
  const backendData = error.response?.data;
  const parsedMessage = parseApiError(error);

  console.groupCollapsed(
    `%c🚨 [API Error ${status || "Network Error"}] ${method} ${url}`,
    "color: #ef4444; font-weight: bold; font-size: 11px;"
  );
  console.error("• Human-Readable Message:\n ", parsedMessage);
  if (backendData !== undefined) {
    console.error("• Raw Backend Response Data:\n", backendData);
  }
  if (error.response?.headers) {
    console.debug("• Response Headers:\n", error.response.headers);
  }
  console.error("• Axios Error Object:\n", error);
  console.groupEnd();
}

// Request Interceptor: Attach X-CSRFToken header if available
axiosInstance.interceptors.request.use(
  (config) => {
    if (
      activeCsrfToken &&
      ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
    ) {
      config.headers["X-CSRFToken"] = activeCsrfToken;
    }
    return config;
  },
  (error) => {
    console.error("❌ [API Request Config Error]:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized via HttpOnly cookie refresh token rotation & central error logging
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";

    // Bypass auto-refresh for authentication endpoints to prevent infinite loops
    if (
      requestUrl.includes("/auth/web/login") ||
      requestUrl.includes("/auth/web/logout") ||
      requestUrl.includes("/auth/web/refresh")
    ) {
      logApiError(error);
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await refreshInstance.post(
          "/auth/web/refresh/",
          {},
          {
            headers: activeCsrfToken ? { "X-CSRFToken": activeCsrfToken } : {},
          }
        );

        // Retry original request after token refresh
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.warn("🔒 [Session Expired] Refresh token invalid or expired.");
        window.dispatchEvent(new Event("auth-session-expired"));
        logApiError(error);
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 403) {
      const code = error.response?.data?.code;
      if (code === "BUSINESS_PERMISSION_DENIED") {
        window.dispatchEvent(
          new CustomEvent("business-permission-denied", {
            detail: {
              code,
              message:
                error.response?.data?.message ||
                "تم رفض العملية لعدم توفر الصلاحية المطلوبة.",
            },
          })
        );
      }
    }

    // Always log any other non-recovered API errors to console with full details
    logApiError(error);

    return Promise.reject(error);
  }
);

