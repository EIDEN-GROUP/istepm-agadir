import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-semibold tracking-tight transition-[color,background-color,box-shadow,transform,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "relative isolate overflow-hidden border border-[color-mix(in_srgb,var(--primary)_78%,var(--foreground)_22%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_88%,#ffffff_12%)_0%,var(--primary)_55%,color-mix(in_srgb,var(--primary)_92%,var(--foreground)_8%)_100%)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_-4px_color-mix(in_srgb,var(--foreground)_38%,transparent)] hover:brightness-[1.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_8px_24px_-6px_color-mix(in_srgb,var(--foreground)_42%,transparent)] active:translate-y-px active:brightness-[0.96]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border-2 border-[color-mix(in_srgb,var(--ring)_55%,var(--border)_45%)] bg-card/90 text-foreground shadow-sm backdrop-blur-sm hover:border-primary hover:bg-[color-mix(in_srgb,var(--accent)_55%,var(--background)_45%)] hover:text-foreground",
        secondary:
          "border border-[color-mix(in_srgb,var(--border)_90%,var(--primary)_10%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--secondary)_96%,var(--eiden-gold)_4%)_0%,var(--secondary)_100%)] text-secondary-foreground shadow-sm hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border)_65%)] hover:brightness-[1.02]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-none px-3.5 text-xs",
        lg: "h-11 rounded-none px-8 text-[0.9375rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
