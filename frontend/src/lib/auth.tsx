import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type UserRole = "directeur" | "enseignant" | "responsable" | "etudiant";

export const ROLES: UserRole[] = ["directeur", "enseignant", "responsable", "etudiant"];

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
  etudiant: {
    label: "Étudiant",
    short: "Étudiant",
    description: "Mon profil, mes cours, mes stages et mes demandes",
  },
};

export const FORMATEUR_STORAGE_KEY = "istpm-selected-formateur";
const ROLE_STORAGE_KEY = "istpm-role";
const TOKEN_STORAGE_KEY = "istpm-token";
const USER_STORAGE_KEY = "istpm-user";

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
  /** Photo de profil (URL http(s) ou data:image). Vide = pastille initiales. */
  photoUrl?: string;
};

type AuthCtx = {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  /**
   * Le rôle affiché n'est pas celui du compte connecté : la fiche profil est
   * alors en lecture seule — toute modification s'appliquerait au vrai compte,
   * pas au rôle consulté.
   */
  impersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Applique un compte mis à jour (email/nom) + jeton renvoyés par l'API. */
  applyAccountUpdate: (token: string, patch: Partial<AuthUser>) => void;
  selectedFormateurId: string | null;
  setSelectedFormateurId: (id: string | null, meta?: { name: string; email: string }) => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  loading: true,
  impersonating: false,
  login: async () => {},
  logout: () => {},
  applyAccountUpdate: () => {},
  selectedFormateurId: null,
  setSelectedFormateurId: () => {},
});

const ROLE_LABEL: Record<UserRole, string> = {
  directeur: "Directeur",
  enseignant: "Enseignant",
  responsable: "Responsable",
  etudiant: "Étudiant",
};

function userFor(role: UserRole): AuthUser {
  // Identité de repli (hydratation sans profil) : le vrai profil vient du login.
  return { id: role, role, name: ROLE_LABEL[role], email: "" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormateurId, setSelectedFormateurId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(FORMATEUR_STORAGE_KEY);
  });
  const [impersonating, setImpersonating] = useState(false);

  /**
   * Mémorise le formateur consulté (filtre d'affichage pour un enseignant).
   * N'accorde aucun droit : l'API applique toujours le périmètre du compte
   * connecté. `meta` (nom/e-mail) vient de la fiche déjà chargée, jamais d'un
   * jeu local.
   */
  const persistSelectedFormateur = useCallback(
    (id: string | null, meta?: { name: string; email: string }) => {
      setSelectedFormateurId(id);
      if (typeof window !== "undefined") {
        if (id) window.localStorage.setItem(FORMATEUR_STORAGE_KEY, id);
        else window.localStorage.removeItem(FORMATEUR_STORAGE_KEY);
      }
      if (id) {
        const authUser: AuthUser = {
          id,
          role: "enseignant",
          name: meta?.name ?? "Enseignant",
          email: meta?.email ?? "",
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ROLE_STORAGE_KEY, "enseignant");
          window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
        }
        setRoleState("enseignant");
        setUserState(authUser);
      }
    },
    [],
  );

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

  // La photo de profil vit côté serveur (`users.photo_url`) mais pas dans le
  // JWT ni dans les identités fabriquées par `userFor` / le sélecteur de rôle.
  // À chaque (re)montage et à chaque changement de rôle, on la ré-hydrate
  // depuis `/auth/me` — mais seulement quand on agit sous son propre rôle
  // (jeton). En impersonation d'un autre rôle, on retombe sur les initiales.
  useEffect(() => {
    if (!role || typeof window === "undefined") return;
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const me: { role?: string; photoUrl?: string } = await res.json();
        const own = me.role ? mapBackendRole(me.role) === role : false;
        setImpersonating(!own);
        const url = own ? (me.photoUrl ?? "") : "";
        setUserState((prev) => {
          if (!prev || prev.photoUrl === url) return prev;
          const next = { ...prev, photoUrl: url };
          try {
            window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
          } catch {
            /* quota / private mode */
          }
          return next;
        });
      } catch {
        /* hors ligne : on garde la photo locale */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

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
      const backendUser: { id: string; email: string; name: string; role: string; photoUrl?: string } = data.user;
      const mappedRole = mapBackendRole(backendUser.role);
      const authUser: AuthUser = {
        id: backendUser.id,
        photoUrl: backendUser.photoUrl ?? "",
        email: backendUser.email,
        name: backendUser.name,
        role: mappedRole,
      };
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      window.localStorage.removeItem(FORMATEUR_STORAGE_KEY);
      setSelectedFormateurId(null);
      persistRole(mappedRole, authUser);
    },
    [persistRole],
  );

  const applyAccountUpdate = useCallback(
    (token: string, patch: Partial<AuthUser>) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      setUserState((prev) => {
        const base = prev ?? (role ? userFor(role) : null);
        if (!base) return prev;
        const next = { ...base, ...patch };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [role],
  );

  const logout = useCallback(() => {
    // Purge les clés applicatives (session, préférence formateur) : évite les
    // résidus sur poste partagé. `gestio-locale` (langue) est conservée, sans
    // donnée personnelle.
    if (typeof window !== "undefined") {
      const doomed: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("istpm-")) doomed.push(k);
      }
      for (const k of doomed) window.localStorage.removeItem(k);
      document.cookie = "sidebar_state=; path=/; max-age=0";
    }
    setRoleState(null);
    setUserState(null);
    setImpersonating(false);
    setSelectedFormateurId(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        loading,
        impersonating,
        login,
        logout,
        applyAccountUpdate,
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
    case "etudiant":
      return "etudiant";
    default:
      return "directeur";
  }
}

export const useAuth = () => useContext(Ctx);
