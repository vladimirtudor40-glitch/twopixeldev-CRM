import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "gold" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-teal text-white border-teal hover:bg-teal-hi",
  secondary: "bg-navy-700 text-ink border-navy-600 hover:border-teal",
  gold: "bg-gold text-navy border-gold hover:bg-gold-hi",
  ghost: "bg-transparent text-ink border-transparent hover:bg-navy-800",
  danger: "bg-transparent text-[#F2A49D] border-danger/50 hover:bg-danger/10",
};
const sizes: Record<Size, string> = { sm: "h-10 px-3 text-xs", md: "h-11 px-4 text-sm" };

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-semibold transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-40",
    variants[variant], sizes[size], className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ variant, size, className, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = "Button";
