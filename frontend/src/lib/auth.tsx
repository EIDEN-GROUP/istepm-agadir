import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { UserRole } from "@/lib/database-types";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "superadmin";
};

type AuthCtx = {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  loading: true,
  login: async () => ({ error: "Not ready" }),
  logout: async () => {},
});

async function fetchUser(): Promise<AuthUser | null> {
  try {
    const token = api.getToken();
    if (!token) return null;
    const user = await api.get<AuthUser>("/auth/me");
    return user;
  } catch {
    api.clearToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    try {
      const res = await api.post<{ token: string; user: AuthUser }>(
        "/auth/login",
        { email, password },
      );
      api.setToken(res.token);
      setUser(res.user);
      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Erreur de connexion",
      };
    }
  };

  const logout = async () => {
    api.clearToken();
    setUser(null);
  };

  const role = user?.role as UserRole | null;

  return (
    <Ctx.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
