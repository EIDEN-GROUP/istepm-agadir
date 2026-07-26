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

// Note: the lg+ rail is now icon-only (see IconRail); useCollapsed is retained
// only for potential reuse and is no longer wired into the shell.
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
 * Light navigation rail surface (reference dashboard). A clean white panel that
 * lifts off the warm cream canvas; the active destination is a filled teal
 * squircle tile, so the brand identity lives in the selection, not the chrome.
 */
const RAIL_STYLE: CSSProperties = {
  backgroundColor: "var(--card)",
};

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
          ? "bg-gradient-to-b from-alert to-alert-dk text-white shadow-[0_10px_22px_-10px_rgb(var(--istpm-shadow)/0.55)]"
          : "text-muted-foreground hover:bg-brand/8 hover:text-brand-dk",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
          active ? "text-white" : "text-muted-foreground/70 group-hover:scale-110 group-hover:text-brand-dk",
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
            ? "bg-alert/12 text-alert-dk"
            : "text-muted-foreground hover:bg-brand/8 hover:text-brand-dk",
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
            ? "bg-alert/12 text-alert-dk"
            : "text-muted-foreground hover:bg-brand/8 hover:text-brand-dk",
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
          "h-9 rounded-xl border-brand/15 bg-brand/5 text-xs font-medium text-foreground shadow-none transition-colors hover:bg-brand/10 focus:ring-0 focus:ring-offset-0 [&>svg]:text-muted-foreground data-[state=open]:bg-brand/10",
          collapsed ? "w-9 justify-center px-0 [&>svg:last-child]:hidden" : "w-full px-3",
        )}
      >
        {collapsed ? (
          <UserCog className="h-4 w-4 shrink-0 text-brand" />
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <UserCog className="h-4 w-4 shrink-0 text-brand" />
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
    <div className="flex h-full min-h-0 flex-col text-foreground" style={RAIL_STYLE}>
      {/* En-tête : marque */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2.5 border-b border-brand/10 px-4",
          collapsed ? "h-16 justify-center px-0" : "h-16",
        )}
      >
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-brand/12">
            <img
              src="/istpm-logo-mark.svg"
              alt={`${brand} logo`}
              className="h-10 w-10"
            />
          </span>
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold leading-tight tracking-tight text-foreground">
                {brand}
              </span>
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
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
            className="ms-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
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
          "shrink-0 space-y-2 border-t border-brand/10 p-3",
          collapsed && "flex flex-col items-center",
        )}
      >
        {collapsed ? null : (
          <div className="flex items-center gap-2.5 rounded-xl bg-brand/5 px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-dk text-sm font-semibold text-white ring-1 ring-brand/15">
              {(user?.name || "A").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-foreground">
                {user?.name}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
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
            "flex items-center gap-2 rounded-xl border border-brand/15 text-xs font-medium text-muted-foreground transition hover:border-alert/40 hover:bg-alert/10 hover:text-alert-dk",
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
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
          >
            <PanelLeftOpen className="h-4 w-4 rtl:rotate-180" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rail compact   icônes seules (style « reference dashboard »)        */
/* ------------------------------------------------------------------ */

const RAIL_TILE =
  "grid h-11 w-11 place-items-center rounded-2xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand/50";
/** Active tile   filled red squircle with a white glyph (brand red accent). */
const RAIL_TILE_ACTIVE =
  "bg-gradient-to-b from-alert to-alert-dk text-white shadow-[0_12px_24px_-12px_rgb(var(--istpm-shadow)/0.7)]";
const RAIL_TILE_IDLE =
  "text-muted-foreground/75 hover:bg-ink/[0.05] hover:text-foreground";

/** Small floating pill revealed to the right of a rail icon on hover. */
function FlyoutPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-brand/10 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[var(--elevation-3)]">
      {children}
    </span>
  );
}

/** Absolutely-positioned hover reveal anchored to the inline-end of a rail row. */
function RailFlyout({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute w-36 start-full top-1/2 z-50 ms-3 -translate-x-1 -translate-y-1/2 opacity-0 transition-all duration-150 group-hover/rail:pointer-events-auto group-hover/rail:translate-x-0 group-hover/rail:opacity-100">
      {children}
    </div>
  );
}

function RailLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <div className="group/rail relative flex justify-center">
      <Link
        to={item.to}
        onClick={onNavigate}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(RAIL_TILE, active ? RAIL_TILE_ACTIVE : RAIL_TILE_IDLE)}
      >
        <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.1 : 1.75} />
      </Link>
      <RailFlyout>
        <FlyoutPill>{item.label}</FlyoutPill>
      </RailFlyout>
    </div>
  );
}

function RailGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;
  const activeChild = group.children.some((c) => isActive(pathname, c.to));
  return (
    <div className="group/rail relative flex justify-center">
      <button
        type="button"
        aria-label={group.label}
        className={cn(RAIL_TILE, activeChild ? RAIL_TILE_ACTIVE : RAIL_TILE_IDLE)}
      >
        <Icon className="h-[19px] w-[19px]" strokeWidth={activeChild ? 2.1 : 1.75} />
      </button>
      <RailFlyout>
        <div className="min-w-[12.5rem] rounded-2xl border border-brand/10 bg-card p-2 shadow-[var(--elevation-3)]">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.children.map((c) => {
              const CIcon = c.icon;
              const a = isActive(pathname, c.to);
              return (
                <Link
                  key={c.to}
                  to={c.to}
                  onClick={onNavigate}
                  aria-current={a ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                    a
                      ? "bg-alert/12 text-alert-dk"
                      : "text-muted-foreground hover:bg-brand/8 hover:text-brand-dk",
                  )}
                >
                  <CIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{c.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </RailFlyout>
    </div>
  );
}

function IconRail({
  brand,
  nav,
  pathname,
}: {
  brand: string;
  nav: NavEntry[];
  pathname: string;
}) {
  const { user, logout } = useAuth();
  const { t } = useDashboardI18n();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col items-center gap-2 py-5">
      <Link
        to="/dashboard"
        aria-label={brand}
        className="grid h-18 w-18 shrink-0 place-items-center"
      >
        <img
          src="/istpm-logo-mark.svg"
          alt={`${brand} logo`}
          className="h-15 w-15"
        />
      </Link>

      <nav
        aria-label={t.shell.mainNavAria}
        className="mt-3 flex flex-1 flex-col items-center gap-1.5"
      >
        {nav.map((entry) =>
          isNavGroup(entry) ? (
            <RailGroup key={entry.id} group={entry} pathname={pathname} />
          ) : (
            <RailLink
              key={entry.to}
              item={entry}
              active={isActive(pathname, entry.to)}
            />
          ),
        )}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-2 pt-2">
        <RoleSwitcher collapsed />
        <div className="group/rail relative flex justify-center">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            aria-label={t.shell.logoutAria}
            className={cn(RAIL_TILE, "h-10 w-10", RAIL_TILE_IDLE, "hover:bg-alert/10 hover:text-alert-dk")}
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
          <RailFlyout>
            <FlyoutPill>{t.shell.logout}</FlyoutPill>
          </RailFlyout>
        </div>
        <span
          aria-hidden
          className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-brand-dk text-xs font-bold text-white ring-1 ring-white/10"
          title={user?.name}
        >
          {(user?.name || "A").slice(0, 1).toUpperCase()}
        </span>
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
      {/* Rail compact permanent (lg+)   icônes seules, fond blanc, style « reference ». */}
      <aside className="hidden w-[5.25rem] shrink-0 border-e border-brand/10 bg-card rounded-tr-4xl lg:block">
        <IconRail brand={brand} nav={nav} pathname={loc.pathname} />
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
            className="absolute end-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
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
              className="h-10 w-10 shrink-0"
            />
            <span className="min-w-0 truncate font-display text-sm font-bold tracking-tight text-foreground">
              {brand}
            </span>
          </Link>
        </header>

        <main className="scroll-touch min-h-0 flex-1 overflow-y-auto">
          {/* data-dashboard-main re-enables the mobile typography / table scaling
              rules in styles.css scoped to this attribute. */}
          <div data-dashboard-main className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <Toaster />
      <AiChatFloating />
    </div>
  );
}
