// src/services/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("nd_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authAPI.me();
      setUser(data);
    } catch (err) {
      console.error("Error loading user:", err.response?.status, err.message);
      // Clear tokens on auth failure
      localStorage.removeItem("nd_token");
      localStorage.removeItem("nd_user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    // Clean up the global logout listener so StrictMode does not register duplicates.
    const handleLogout = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("nd:logout", handleLogout);
    return () => window.removeEventListener("nd:logout", handleLogout);
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem("nd_token", data.token);
    localStorage.setItem("nd_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password, role) => {
    const { data } = await authAPI.register({ username, email, password, role });
    localStorage.setItem("nd_token", data.token);
    localStorage.setItem("nd_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("nd_token");
    localStorage.removeItem("nd_user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data);
      return data;
    } catch (err) {
      console.error("Error refreshing user:", err.response?.status, err.message);
      // If refresh fails, clear auth data
      if (err.response?.status === 401) {
        localStorage.removeItem("nd_token");
        localStorage.removeItem("nd_user");
        setUser(null);
      }
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
