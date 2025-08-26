// frontend/src/api/apiClient.js

// FIX: когда перезагрузка страницы, то падает авторизация
// сначала loading, потом страница авторизации

import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8010",
  timeout: 10000, // 10 секунд
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newAccessToken) => {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const res = await axios.post("http://127.0.0.1:8010/auth/refresh", { refreshToken });

        const newAccessToken = res.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);

        api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
        onRefreshed(newAccessToken);

        return api(originalRequest);
        } catch (err) {
          console.error("[API] Refresh token failed:", err);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user"); // ⭐ Добавить очистку user
          
          window.dispatchEvent(new CustomEvent('auth-expired'));
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
    }

    return Promise.reject(error);
  }
);

export default api;
