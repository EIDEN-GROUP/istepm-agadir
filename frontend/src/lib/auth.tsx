/**
 * Frontend-only "auth" for the ISTPM demo.
 *
 * There is no backend and no real authentication: the three roles below are
 * purely UI states that decide which navigation items, dashboard sections and
 * actions are visible. The selected role is persisted to localStorage so a
 * refresh keeps you in the same interface.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type UserRole = "directeur" | "enseignant" | "responsable";

export const ROLES: UserRole[] = ["directeur", "enseignant", "responsable"];

/** Display metadata for the login picker and the header role switcher. */
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

/** Sample identity shown in the header for each role. */
const ROLE_USER: Record<UserRole, { name: string; email: string }> = {
  directeur: { name: "Dr. Youssef Benali", email: "direction@istpm-agadir.ma" },
  enseignant: { name: "Mme Salma Ait Taleb", email: "s.aittaleb@istpm-agadir.ma" },
  responsable: { name: "M. Rachid El Ouafi", email: "scolarite@istpm-agadir.ma" },
};

const STORAGE_KEY = "istpm-role";

function isRole(value: string | null): value is UserRole {
  return value !== null && (ROLES as string[]).includes(value);
}

function readStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isRole(stored) ? stored : null;
}

/** Read the persisted role outside React (used by the route guard). */
export function getStoredRole(): UserRole | null {
  return readStoredRole();
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
  /** Sign in as a role. No network, no credentials checked. */
  login: (role: UserRole) => void;
  /** Switch interface without signing out. */
  setRole: (role: UserRole) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  loading: true,
  login: () => {},
  setRole: () => {},
  logout: () => {},
});

function userFor(role: UserRole): AuthUser {
  return { id: role, role, ...ROLE_USER[role] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Read storage in an effect rather than in the initial state so the first
  // render is identical every time (matches the locale provider's pattern).
  useEffect(() => {
    setRoleState(readStoredRole());
    setLoading(false);
  }, []);

  const setRole = useCallback((next: UserRole) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setRoleState(next);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRoleState(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: role ? userFor(role) : null,
        role,
        loading,
        login: setRole,
        setRole,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
