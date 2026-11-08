import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full min-w-0 rounded-lg border border-navy-600 bg-navy px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 " +
  "focus:border-teal focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(control, "h-11", className)} {...p} />
));
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(control, "h-11 pr-8", className)} {...p} />
));
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-[80px]", className)} {...p} />
));
Textarea.displayName = "Textarea";

export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-muted">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger-hi" role="alert">{error}</p> : hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
