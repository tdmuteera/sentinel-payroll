import axios from "axios";

function normalizeApiBase(raw) {
  const base = (raw || "http://localhost:5000").replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return normalizeApiBase(envUrl);
  }
  if (typeof window !== "undefined" && window.location) {
    const { protocol, origin } = window.location;
    if (protocol === "http:" || protocol === "https:") {
      return `${origin}/api`;
    }
  }
  return normalizeApiBase("http://localhost:5000");
}

const BASE_URL = resolveBaseUrl();

export function getApiBaseUrl() {
  return BASE_URL.replace(/\/api\/?$/, "") || "http://localhost:5000";
}

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sentinel_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
