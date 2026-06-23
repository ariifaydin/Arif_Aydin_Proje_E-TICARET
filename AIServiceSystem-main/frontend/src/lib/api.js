import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // token invalid; clear and reload to login
      const onAuthPage = window.location.pathname.startsWith("/giris") || window.location.pathname.startsWith("/kayit");
      if (!onAuthPage) {
        localStorage.removeItem("hv_token");
        localStorage.removeItem("hv_user");
      }
    }
    return Promise.reject(err);
  }
);
