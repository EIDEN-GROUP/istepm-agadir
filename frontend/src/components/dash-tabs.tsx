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
/*  DashTabs   modern pill/indicator tab bar                          */
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
        "relative flex w-full gap-1 overflow-x-auto rounded-3xl border-b border-border bg-background/80 backdrop-blur-sm scrollbar-none",
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
              "relative flex items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors duration-200",
              "outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-inset",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  "hidden h-4 w-4 shrink-0 transition-colors sm:block",
                  isActive ? "text-brand" : "text-muted-foreground",
                )}
              />
            ) : null}
            <span className="truncate">
              <span className="sm:hidden">{t.short ?? t.label}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </span>
            {t.badge != null && t.badge > 0 ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none",
                  isActive
                    ? "bg-brand text-white"
                    : "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                {t.badge > 99 ? "99+" : t.badge}
              </span>
            ) : null}
            {/* Animated underline indicator */}
            {isActive ? (
              <motion.span
                layoutId="dash-tab-underline"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DashTabPanel   animated enter/exit with direction                  */
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
