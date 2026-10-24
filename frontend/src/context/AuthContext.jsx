import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = no auth

  const loadUser = useCallback(async () => {
    // Google sign-in callback exchanges session_id first (see AuthCallback)
    if (  window.location.hash?.includes("session_id=") || window.location.hash?.includes("token=")) return;
    const token = localStorage.getItem("bc_token");
    if (!token) { setUser(null); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("bc_token");
      setUser(null);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bc_token", data.token);
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("bc_token", data.token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    localStorage.removeItem("bc_token");
    setUser(null);
  };

  const refreshUser = loadUser;

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
