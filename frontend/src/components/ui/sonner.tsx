import { Toaster as Sonner } from "sonner";

const Toaster = () => {
  return (
    <Sonner
      position="top-right"
      gap={10}
      offset={16}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast !rounded-2xl !border !border-[#28396C]/10 !bg-card !px-5 !py-4 !font-sans !shadow-[0_14px_30px_-14px_rgba(0,0,0,0.15)]",
          title:
            "!font-display !text-sm !font-semibold !tracking-tight !text-foreground",
          description:
            "!mt-0.5 !text-xs !leading-relaxed !text-muted-foreground",
          success:
            "!border-l-[3px] !border-l-emerald-500",
          error:
            "!border-l-[3px] !border-l-red-500",
          warning:
            "!border-l-[3px] !border-l-amber-500",
          icon: "!h-4 !w-4",
          actionButton:
            "!rounded-full !bg-[#B5E18B] !px-4 !py-1.5 !text-xs !font-bold !text-[#28396C] !shadow-none !transition hover:!brightness-105",
          cancelButton:
            "!rounded-full !border !border-[#28396C]/15 !bg-transparent !px-4 !py-1.5 !text-xs !font-medium !text-foreground !shadow-none hover:!bg-muted",
          closeButton:
            "!rounded-full !border-0 !bg-transparent !text-muted-foreground/50 hover:!text-muted-foreground",
        },
      }}
    />
  );
};

export { Toaster };
