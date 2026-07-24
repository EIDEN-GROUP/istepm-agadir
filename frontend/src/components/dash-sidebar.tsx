/**
 * Sidebar application shell.
 *
 * Replaces the previous horizontal top-nav. Layout:
 *   · lg and up   a persistent left rail that collapses to icons only,
 *     with the collapsed state remembered across sessions.
 *   · below lg   a slim top bar with a hamburger that slides the same rail
 *     in as an overlay drawer.
 *
 * Direction-aware throughout: the rail is the first flex child and uses
 * logical properties (`start-*`, `border-e`), so `dir="rtl"` moves it to the
 * right without a second set of styles.
 */
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
  X,
  UserCog,
} from "lucide-react";
import { ROLES, ROLE_META, useAuth } from "@/lib/auth";
import { useDashboardI18n } from "@/lib/dashboard-i18n";
import { Toaster } from "@/components/ui/sonner";
import { AiChatFloating } from "@/components/ai-chat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types de navigation                                                */
/* ------------------------------------------------------------------ */

export type NavItem = {
  to: string;
  label: string;
  /** Condensed label, used where the full one would not fit. */
  shortLabel?: string;
  icon: LucideIcon;
};

/** A collapsible section holding related destinations (e.g. « Scolarité »). */
export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

/**
 * Is this destination the active one? `/dashboard` is the index and must match
 * exactly, or it would light up on every child route.
 */
function isActive(pathname: string, to: string) {
  if (to === "/dashboard")
    return pathname === "/dashboard" || pathname === "/dashboard/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/* ------------------------------------------------------------------ */
/*  Réglage : rail replié                                              */
/* ------------------------------------------------------------------ */

const COLLAPSE_KEY = "istpm-sidebar-collapsed";

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  }, []);

  return { collapsed, toggle };
}

/* ------------------------------------------------------------------ */
/*  Éléments de navigation                                             */
/* ------------------------------------------------------------------ */

const ROW_BASE =
  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-lt/60";

/**
 * Dark navigation rail surface. A deep teal-ink gradient with a lit top edge
 * and a faint brand glow at the base   keeps the institute's teal identity
 * while giving the shell the premium, focused feel of the reference dashboards.
 */
const RAIL_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--istpm-ink) 90%, #000)",
};

/** Slim teal accent bar on the inline-start edge of the active row. */
function ActiveIndicator({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-2 start-0 w-[3px] rounded-full bg-brand-lt transition-all duration-200",
        show ? "opacity-100" : "scale-y-0 opacity-0",
      )}
    />
  );
}

function NavRow({
  item,
  collapsed,
  active,
  nested,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW_BASE,
        collapsed ? "justify-center px-0" : nested && "ps-9",
        active
          ? "bg-white/[0.09] text-white ring-1 ring-inset ring-white/10"
          : "text-white/55 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {active && !collapsed ? <ActiveIndicator show /> : null}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
          active ? "text-brand-lt" : "group-hover:scale-110",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {/* Label is unmounted (not just hidden) when collapsed so it cannot be
          reached by keyboard or read out while invisible. */}
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function NavGroupBlock({
  group,
  collapsed,
  pathname,
  onNavigate,
  onExpandRail,
}: {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  onExpandRail: () => void;
}) {
  const hasActiveChild = group.children.some((c) => isActive(pathname, c.to));
  const [open, setOpen] = useState(hasActiveChild);

  // Navigating into one of the group's routes reveals the group.
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const Icon = group.icon;

  // Collapsed rail has no room for children: the button expands the rail
  // instead, then opens the group.
  if (collapsed) {
    return (
      <button
        type="button"
        title={group.label}
        onClick={() => {
          onExpandRail();
          setOpen(true);
        }}
        className={cn(
          ROW_BASE,
          "w-full justify-center px-0",
          hasActiveChild
            ? "bg-white/10 text-white"
            : "text-white/60 hover:bg-white/[0.07] hover:text-white",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          ROW_BASE,
          "w-full",
          hasActiveChild && !open
            ? "bg-white/10 text-white"
            : "text-white/60 hover:bg-white/[0.07] hover:text-white",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate text-start">{group.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      {/* grid-rows 0fr→1fr animates to the content's natural height, which a
          max-height transition can only approximate. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        {/* The grid-rows animation keeps children mounted while clipped, so
            `inert` is needed to keep them out of the tab order and off the
            accessibility tree until the group is actually open. */}
        <div className="overflow-hidden" inert={!open}>
          <div className="mt-1 space-y-1">
            {group.children.map((child) => (
              <NavRow
                key={child.to}
                item={child}
                collapsed={false}
                nested
                active={isActive(pathname, child.to)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sélecteur de profil                                                */
/* ------------------------------------------------------------------ */

function RoleSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { role, setRole } = useAuth();
  const navigate = useNavigate();
  if (!role) return null;

  return (
    <Select
      value={role}
      onValueChange={(next) => {
        setRole(next as (typeof ROLES)[number]);
        // Avoid being stranded on a page the new role cannot reach.
        navigate({ to: "/dashboard" });
      }}
    >
      <SelectTrigger
        aria-label="Changer de profil"
        className={cn(
          "h-9 rounded-xl border-white/12 bg-white/[0.06] text-xs font-medium text-white/85 shadow-none transition-colors hover:bg-white/10 focus:ring-0 focus:ring-offset-0 [&>svg]:text-white/50 data-[state=open]:bg-white/10",
          collapsed ? "w-9 justify-center px-0 [&>svg:last-child]:hidden" : "w-full px-3",
        )}
      >
        {collapsed ? (
          <UserCog className="h-4 w-4 shrink-0 text-brand-lt" />
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <UserCog className="h-4 w-4 shrink-0 text-brand-lt" />
            <span className="truncate">{ROLE_META[role].short}</span>
          </span>
        )}
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-brand/15">
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} className="text-xs">
            {ROLE_META[r].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/*  Contenu du rail                                                    */
/* ------------------------------------------------------------------ */

function SidebarBody({
  brand,
  nav,
  collapsed,
  pathname,
  onNavigate,
  onToggleCollapse,
  onExpandRail,
  showCollapseToggle,
}: {
  brand: string;
  nav: NavEntry[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  onExpandRail: () => void;
  showCollapseToggle?: boolean;
}) {
  const { user, logout } = useAuth();
  const { t } = useDashboardI18n();
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col text-white" style={RAIL_STYLE}>
      {/* En-tête : marque */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2.5 border-b border-white/10 px-4",
          collapsed ? "h-16 justify-center px-0" : "h-16",
        )}
      >
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
            <img
              src="/istpm-logo-mark.svg"
              alt={`${brand} logo`}
              className="h-7 w-7"
            />
          </span>
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold leading-tight tracking-tight text-white">
                {brand}
              </span>
              <span className="block truncate text-[10px] leading-tight text-white/55">
                Techniques paramédicales
              </span>
            </span>
          )}
        </Link>
        {showCollapseToggle && !collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Réduire le menu"
            className="ms-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4 rtl:rotate-180" />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav
        aria-label={t.shell.mainNavAria}
        className="scroll-touch min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
      >
        {nav.map((entry) =>
          isNavGroup(entry) ? (
            <NavGroupBlock
              key={entry.id}
              group={entry}
              collapsed={collapsed}
              pathname={pathname}
              onNavigate={onNavigate}
              onExpandRail={onExpandRail}
            />
          ) : (
            <NavRow
              key={entry.to}
              item={entry}
              collapsed={collapsed}
              active={isActive(pathname, entry.to)}
              onNavigate={onNavigate}
            />
          ),
        )}
      </nav>

      {/* Pied : profil + déconnexion */}
      <div
        className={cn(
          "shrink-0 space-y-2 border-t border-white/10 p-3",
          collapsed && "flex flex-col items-center",
        )}
      >
        {collapsed ? null : (
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white ring-1 ring-white/15">
              {(user?.name || "A").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">
                {user?.name}
              </span>
              <span className="block truncate text-[10px] text-white/55">
                {user ? ROLE_META[user.role].label : null}
              </span>
            </span>
          </div>
        )}

        <RoleSwitcher collapsed={collapsed} />

        <button
          type="button"
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          aria-label={t.shell.logoutAria}
          title={collapsed ? t.shell.logout : undefined}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-white/12 text-xs font-medium text-white/70 transition hover:border-alert/40 hover:bg-alert/15 hover:text-white",
            collapsed ? "h-9 w-9 justify-center" : "w-full px-3 py-2",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {collapsed ? null : <span>{t.shell.logout}</span>}
        </button>

        {showCollapseToggle && collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Déplier le menu"
            className="grid h-9 w-9 place-items-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftOpen className="h-4 w-4 rtl:rotate-180" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Coque                                                              */
/* ------------------------------------------------------------------ */

export function DashSidebarShell({
  brand,
  nav,
  dir,
  children,
}: {
  brand: string;
  nav: NavEntry[];
  dir?: "ltr" | "rtl";
  children: ReactNode;
}) {
  const loc = useLocation();
  const { collapsed, toggle } = useCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Route change closes the mobile drawer.
  useEffect(() => setDrawerOpen(false), [loc.pathname]);

  // Escape closes the drawer, and body scroll is locked while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div dir={dir} className="app-canvas flex h-dvh min-h-0 overflow-hidden">
      {/* Rail permanent (lg+) */}
      <aside
        className={cn(
          "hidden shrink-0 border-e border-brand/12 transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[4.75rem]" : "w-[16.5rem]",
        )}
      >
        <SidebarBody
          brand={brand}
          nav={nav}
          collapsed={collapsed}
          pathname={loc.pathname}
          onToggleCollapse={toggle}
          onExpandRail={() => collapsed && toggle()}
          showCollapseToggle
        />
      </aside>

      {/* Tiroir mobile */}
      <div
        aria-hidden={!drawerOpen}
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal={drawerOpen}
          aria-label="Menu"
          className={cn(
            "absolute inset-y-0 start-0 w-[17rem] max-w-[85vw] shadow-2xl transition-transform duration-300 ease-out",
            drawerOpen
              ? "translate-x-0"
              : "-translate-x-full rtl:translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
            className="absolute end-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarBody
            brand={brand}
            nav={nav}
            collapsed={false}
            pathname={loc.pathname}
            onNavigate={() => setDrawerOpen(false)}
            onExpandRail={() => {}}
          />
        </div>
      </div>

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
        <header className="glass-bar flex h-14 shrink-0 items-center gap-3 border-b border-brand/12 px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <img
              src="/istpm-logo-mark.svg"
              alt={`${brand} logo`}
              className="h-8 w-8 shrink-0"
            />
            <span className="min-w-0 truncate font-display text-sm font-bold tracking-tight text-foreground">
              {brand}
            </span>
          </Link>
        </header>

        <main className="scroll-touch min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <Toaster />
      <AiChatFloating />
    </div>
  );
}
