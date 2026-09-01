// Centralized API Configuration
// In development, we route through Vite proxy '/api/v1' to prevent browser CORS credential errors.
// In production or custom env, it points directly to the Render API endpoint.

export const API_CONFIG = {
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
      ? "/api/v1"
      : "https://asas-school.onrender.com/api/v1"),
};
