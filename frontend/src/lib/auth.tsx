import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { FORMATEURS } from "@/lib/istpm-data";

export type UserRole = "directeur" | "enseignant" | "responsable";

export const ROLES: UserRole[] = ["directeur", "enseignant", "responsable"];

export const ROLE_META: Record<
  UserRole,
  { label: string; short: string; description: string }
> = {
  directeur: {
    label: "Directeur",
    short: "Directeur",
    description: "Accès complet · pilotage académique et financier",
  },
  enseignant: {
    label: "Enseignant (formateur)",
    short: "Enseignant",
    description: "Mes groupes, mes examens et la saisie des notes",
  },
  responsable: {
    label: "Responsable des affaires estudiantines",
    short: "Resp. affaires estudiantines",
    description: "Inscriptions, recouvrement, conventions de stage",
  },
};

export const DEMO_FORMATEUR_ID = "fo-1";

const demoFormateur = FORMATEURS.find((f) => f.id === DEMO_FORMATEUR_ID);

const ROLE_USER: Record<UserRole, { name: string; email: string }> = {
  directeur: { name: "Dr. Youssef Benali", email: "direction@istpm-agadir.ma" },
  enseignant: {
    name: demoFormateur
      ? `${demoFormateur.prenom} ${demoFormateur.nom}`
      : "Formateur",
    email: demoFormateur?.email ?? "formateur@istpm-agadir.ma",
  },
  responsable: { name: "M. Rachid El Ouafi", email: "scolarite@istpm-agadir.ma" },
};

const ROLE_STORAGE_KEY = "istpm-role";
const TOKEN_STORAGE_KEY = "istpm-token";
const USER_STORAGE_KEY = "istpm-user";
export const FORMATEUR_STORAGE_KEY = "istpm-selected-formateur";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function isRole(value: string | null): value is UserRole {
  return value !== null && (ROLES as string[]).includes(value);
}

function readStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (isRole(stored)) return stored;
  const userData = window.localStorage.getItem(USER_STORAGE_KEY);
  if (userData) {
    try {
      const u = JSON.parse(userData);
      if (isRole(u.role)) return u.role;
    } catch {}
  }
  return null;
}

export function getStoredRole(): UserRole | null {
  return readStoredRole();
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

type AuthCtx = {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setRole: (role: UserRole) => void;
  logout: () => void;
  selectedFormateurId: string | null;
  setSelectedFormateurId: (id: string | null) => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  setRole: () => {},
  logout: () => {},
  selectedFormateurId: null,
  setSelectedFormateurId: () => {},
});

function userFor(role: UserRole): AuthUser {
  return { id: role, role, ...ROLE_USER[role] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormateurId, setSelectedFormateurId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(FORMATEUR_STORAGE_KEY);
  });

  const persistSelectedFormateur = useCallback((id: string | null) => {
    setSelectedFormateurId(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(FORMATEUR_STORAGE_KEY, id);
      else window.localStorage.removeItem(FORMATEUR_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredRole();
    if (stored) {
      setRoleState(stored);
      const userData = window.localStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        try {
          setUserState(JSON.parse(userData));
        } catch {
          setUserState(userFor(stored));
        }
      } else {
        setUserState(userFor(stored));
      }
    }
    setLoading(false);
  }, []);

  const persistRole = useCallback((next: UserRole, userData?: AuthUser) => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
    setRoleState(next);
    if (userData) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUserState(userData);
    } else {
      const u = userFor(next);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      setUserState(u);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur de connexion" }));
        throw new Error(err.error || "Email ou mot de passe incorrect");
      }
      const data = await res.json();
      const token: string = data.token;
      const backendUser: { id: string; email: string; name: string; role: string } = data.user;
      const mappedRole = mapBackendRole(backendUser.role);
      const authUser: AuthUser = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: mappedRole,
      };
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      persistRole(mappedRole, authUser);
    },
    [persistRole],
  );

  const setRole = useCallback(
    (next: UserRole) => persistRole(next),
    [persistRole],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(FORMATEUR_STORAGE_KEY);
    setRoleState(null);
    setUserState(null);
    setSelectedFormateurId(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        loading,
        login,
        setRole,
        logout,
        selectedFormateurId,
        setSelectedFormateurId: persistSelectedFormateur,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function mapBackendRole(backendRole: string): UserRole {
  switch (backendRole) {
    case "admin":
    case "superadmin":
    case "directeur":
      return "directeur";
    case "enseignant":
      return "enseignant";
    case "responsable":
      return "responsable";
    default:
      return "directeur";
  }
}

export const useAuth = () => useContext(Ctx);
