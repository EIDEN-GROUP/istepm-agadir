import { useRouterState } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardI18n, type DashboardLocale } from "@/lib/dashboard-i18n";

function LanguageToggleButton({
  locale,
  onToggle,
  label,
}: {
  locale: DashboardLocale;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Languages className="h-5 w-5" strokeWidth={2} aria-hidden />
      <span className="sr-only">
        {locale === "fr" ? "العربية" : "Français"}
      </span>
      <span
        className="pointer-events-none absolute -bottom-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-black uppercase text-primary-foreground"
        aria-hidden
      >
        {locale === "fr" ? "AR" : "FR"}
      </span>
    </button>
  );
}

export function LanguageToggleFloating() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locale, toggleLocale } = useDashboardI18n();

  const show =
    pathname.startsWith("/login") || pathname.startsWith("/dashboard");
  if (!show) return null;

  const langLabel =
    locale === "fr" ? "Passer en arabe" : "التبديل إلى الفرنسية";

  const onDashboard = pathname.startsWith("/dashboard");

  return (
    <div
      className={cn(
        "fixed z-[60] flex flex-col items-center gap-2",
        "end-[max(1rem,env(safe-area-inset-right))]",
        onDashboard
          ? "bottom-[calc(5rem+max(0.5rem,env(safe-area-inset-bottom)))] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      {/* The support-chat widget was removed from the ISTPM shell: it is out of
          scope and its polling hit a backend this frontend-only build no
          longer has. The dashboard offset above is kept so the toggle still
          clears the mobile tab bar. */}
      <LanguageToggleButton
        locale={locale}
        onToggle={toggleLocale}
        label={langLabel}
      />
    </div>
  );
}
