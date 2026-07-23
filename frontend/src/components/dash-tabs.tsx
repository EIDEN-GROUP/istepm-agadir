import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export type DashTab = {
  label: string;
  short?: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: number;
};

/* ------------------------------------------------------------------ */
/*  DashTabs — modern pill/indicator tab bar                          */
/* ------------------------------------------------------------------ */

export function DashTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: DashTab[];
  active: number;
  onChange: (i: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full overflow-x-auto rounded-2xl border border-brand/10 bg-muted/60 p-1 shadow-[0_4px_20px_-8px_rgb(var(--istpm-shadow)/0.18)]",
        "scrollbar-none",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t, i) => {
        const isActive = i === active;
        const Icon = t.icon;
        return (
          <button
            key={t.label}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(i)}
            className={cn(
              "relative z-10 flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              "outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1",
              isActive
                ? "text-brand-dk"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? (
              <Icon className="hidden h-4 w-4 shrink-0 sm:block" />
            ) : null}
            <span className="truncate whitespace-nowrap">
              <span className="sm:hidden">{t.short ?? t.label}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </span>
            {t.badge != null && t.badge > 0 ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none",
                  isActive
                    ? "bg-brand/15 text-brand-dk"
                    : "bg-muted-foreground/12 text-muted-foreground",
                )}
              >
                {t.badge > 99 ? "99+" : t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
      {/* Animated floating indicator */}
      <motion.div
        layout
        layoutId="dash-tab-indicator"
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className={cn(
          "pointer-events-none absolute bottom-1 left-0 top-1 z-0 rounded-xl bg-card shadow-[0_2px_8px_-2px_rgb(var(--istpm-shadow)/0.24)]",
          "ring-1 ring-black/[0.03]",
        )}
        style={{
          left: `${(100 / tabs.length) * active}%`,
          width: `${100 / tabs.length}%`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DashTabPanel — animated enter/exit with direction                  */
/* ------------------------------------------------------------------ */

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 40 : -40,
    opacity: 0,
  }),
};

export function DashTabPanel({
  index,
  direction,
  children,
}: {
  index: number;
  direction: number;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 360, damping: 30 },
            opacity: { duration: 0.2 },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
