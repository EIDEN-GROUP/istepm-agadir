/**
 * Branded loading screen.
 *
 * A full-viewport, brand-tinted splash that draws the ISTEPM mark with a soft
 * halo, the wordmark, and an indeterminate progress rail. Used both as the
 * initial boot gate (`AppLoadingGate`) and as a reusable overlay.
 *
 * Motion is framer-motion driven and respects `prefers-reduced-motion` via the
 * global reduced-motion rules in `styles.css`.
 */
import { type ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** The visual splash. Renders centered on a brand-tinted canvas. */
export function BrandLoader({
  label = "ISTEPM Agadir",
  sublabel = "Techniques paramédicales",
}: {
  label?: string;
  sublabel?: string;
}) {
  return (
    <div className="app-canvas fixed inset-0 z-[200] grid place-items-center overflow-hidden">
      {/* Soft brand aura behind the mark */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="pointer-events-none absolute h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--istpm-teal) 22%, transparent) 0%, transparent 68%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo mark with pulsing halo ring */}
        <div className="relative grid place-items-center">
          <motion.span
            aria-hidden
            className="absolute rounded-full"
            style={{
              width: "7.5rem",
              height: "7.5rem",
              boxShadow: "0 0 0 1px color-mix(in srgb, var(--istpm-teal) 30%, transparent)",
            }}
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: [0.5, 0, 0.5], scale: [0.9, 1.35, 0.9] }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative grid h-24 w-24 place-items-center rounded-[1.75rem] bg-card shadow-[var(--edge-highlight),var(--elevation-3)] ring-1 ring-brand/12"
          >
            <motion.img
              src="/istpm-logo-mark.svg"
              alt={`${label} logo`}
              className="h-14 w-14"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            />
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="text-center"
        >
          <p className="font-display text-lg font-bold tracking-tight text-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {sublabel}
          </p>
        </motion.div>

        {/* Indeterminate progress rail */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative h-1 w-40 overflow-hidden rounded-full bg-brand/12"
        >
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-brand to-brand-lt animate-brand-progress" />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Boot gate. Shows the branded splash on first mount for at least `minMs`, then
 * fades it out and reveals the app. Purely presentational   it renders children
 * immediately underneath, so no data loading or routing is affected.
 */
export function AppLoadingGate({
  children,
  minMs = 1100,
}: {
  children: ReactNode;
  minMs?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), minMs);
    return () => clearTimeout(t);
  }, [minMs]);

  return (
    <>
      {children}
      <AnimatePresence>
        {!ready ? (
          <motion.div
            key="boot-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <BrandLoader />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
