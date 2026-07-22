import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { getToken, setToken, clearToken, apiFetch, API_BASE } from "@/lib/api";
import { useLocation } from "wouter";

type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  has_travel_profile: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState(true);
  // Guard against calling logout() re-triggering the useEffect infinitely
  const isLoggingOut = useRef(false);

  useEffect(() => {
    if (isLoggingOut.current) return;

    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiFetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          // Token is invalid or expired — clear it without redirecting
          clearToken();
          setTokenState(null);
          setUser(null);
        }
      } catch {
        // Network error — don't log out, just stop loading
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string): Promise<void> => {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      // Surface the actual backend error message when available
      let detail = "Invalid email or password";
      try {
        const err = await res.json();
        if (err.detail) detail = err.detail;
      } catch { /* ignore parse errors */ }
      throw new Error(detail);
    }

    const data = await res.json();
    setToken(data.access_token);
    setTokenState(data.access_token);
    // useEffect will run and populate `user` from /api/users/me
  };

  const register = async (email: string, password: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let detail = "Registration failed";
      try {
        const err = await res.json();
        // FastAPI returns { detail: string } or { detail: [{msg, ...}] }
        if (typeof err.detail === "string") {
          detail = err.detail;
        } else if (Array.isArray(err.detail) && err.detail[0]?.msg) {
          detail = err.detail[0].msg;
        }
      } catch { /* ignore */ }
      throw new Error(detail);
    }

    // Registration succeeded — immediately log in
    await login(email, password);
  };

  const logout = () => {
    isLoggingOut.current = true;
    clearToken();
    setTokenState(null);
    setUser(null);
    // Use replace so the back button doesn't return to the protected page
    window.location.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
