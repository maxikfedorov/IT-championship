// frontend/src/api/useAuth.js
import { useState, useEffect } from "react";
import api from "./apiClient"; // тот самый axios instance

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Добавить состояние загрузки

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");
      
      if (savedUser && accessToken) {
        try {
          // Проверяем валидность токена
          await api.get("/auth/verify"); // Добавить эндпоинт проверки
          setUser(JSON.parse(savedUser));
        } catch (error) {
          // Токен невалиден - очищаем все
          console.log("Token invalid, clearing auth data");
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // login через бекенд
  const login = async (username, password) => {
    try {
      const res = await api.post("/auth/login", { username, password }); // <=== правильное тело
      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      setUser(user);
      return user;
    } catch (err) {
      console.error("[useAuth] login error:", err);
      throw err;
    }
  };
  // logout
  const logout = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken) {
        await api.post("/auth/logout");
      }
    } catch (err) {
      console.warn("[useAuth] logout: server unreachable, but clearing local state");
    }

    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  return { user, login, logout, isLoading }; 
}
