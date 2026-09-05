// Centralized API Configuration
// Both in development and production, we route through relative '/api/v1'
// (Vite dev proxy in development, Vercel rewrites in production)
// to ensure same-origin requests, eliminating Safari ITP & Incognito cross-site cookie/CSRF issues.

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
};
