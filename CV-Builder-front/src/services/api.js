import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  // These endpoints NEVER need a Bearer token
  const publicPaths = [
    "/api/auth/register/", 
    "/api/auth/verify-email/", 
    "/api/auth/token/", 
    "/api/auth/token/refresh/",
    //"/api/auth/logout/",
    "/api/auth/google/",
    "/api/auth/forgot-password/",
    "/api/auth/reset-password/"
  ];
  
  const isPublicPath = publicPaths.some(path => config.url.includes(path));
  const token = localStorage.getItem("access_token");

  if (token && !isPublicPath) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;