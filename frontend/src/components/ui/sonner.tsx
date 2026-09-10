import { Toaster as Sonner } from "sonner";

/**
 * Toasts   discrets, alignés sur la charte : carte claire, coin franc (pas de
 * pilule), filet de couleur à gauche selon le type, titre en sans medium (pas
 * de display gras qui « crie »). Icône colorée, calée sur la première ligne.
 */
const Toaster = () => {
  return (
    <Sonner
      position="top-right"
      gap={8}
      offset={16}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast !w-[356px] !items-start !gap-3 !rounded-lg !border !border-[color:rgb(var(--istpm-ink-rgb)/0.08)] !border-l-2 !bg-card !px-4 !py-3 !font-sans !shadow-[0_1px_2px_rgb(var(--istpm-ink-rgb)/0.06),0_10px_28px_-12px_rgb(var(--istpm-ink-rgb)/0.18)]",
          title:
            "!font-sans !text-[13px] !font-medium !leading-snug !text-foreground",
          description:
            "!mt-1 !text-xs !leading-relaxed !text-muted-foreground",
          default: "!border-l-brand/40",
          success: "!border-l-emerald-500",
          error: "!border-l-alert",
          warning: "!border-l-warn",
          info: "!border-l-info",
          icon: "!m-0 !mt-[3px] !h-[15px] !w-[15px] !shrink-0",
          content: "!gap-0",
          actionButton:
            "!rounded-md !bg-brand !px-3 !py-1 !text-xs !font-semibold !text-white !shadow-none hover:!brightness-105",
          cancelButton:
            "!rounded-md !border !border-brand/15 !bg-transparent !px-3 !py-1 !text-xs !font-medium !text-foreground hover:!bg-muted",
          closeButton:
            "!left-auto !right-1.5 !top-1.5 !h-5 !w-5 !border-0 !bg-transparent !text-muted-foreground/50 hover:!text-muted-foreground",
        },
      }}
    />
  );
};

export { Toaster };
