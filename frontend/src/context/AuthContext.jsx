import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

function decodeJwtPayload(payloadPart) {
  const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

function decodeToken(token) {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) {
      return null;
    }
    return decodeJwtPayload(payloadPart);
  } catch (error) {
    return null;
  }
}

function getInitialSession() {
  const token = localStorage.getItem("sentinel_token");
  if (!token) {
    return { token: null, user: null };
  }

  const decoded = decodeToken(token);
  if (!decoded || (decoded.exp && decoded.exp * 1000 < Date.now())) {
    localStorage.removeItem("sentinel_token");
    return { token: null, user: null };
  }

  return {
    token,
    user: {
      id: decoded.id,
      employeeId: decoded.employeeId ?? decoded.id,
      email: decoded.email ?? null,
      role: decoded.role,
      fullName: decoded.fullName,
    },
  };
}

export function AuthProvider({ children }) {
  const initial = getInitialSession();
  const [token, setToken] = useState(initial.token);
  const [user, setUser] = useState(initial.user);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const nextToken = response.data.token;
    localStorage.setItem("sentinel_token", nextToken);
    setToken(nextToken);
    setUser(response.data.user);
    return response.data.user;
  };

  const loginEmployee = async (departmentId, employeeId, password) => {
    const response = await api.post("/auth/employee/login", {
      department_id: departmentId,
      employee_id: employeeId,
      password,
    });
    const nextToken = response.data.token;
    localStorage.setItem("sentinel_token", nextToken);
    setUser(response.data.user);
    setToken(nextToken);
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem("sentinel_token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      loginEmployee,
      logout,
      isAuthenticated: Boolean(token),
      role: user?.role || null,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
