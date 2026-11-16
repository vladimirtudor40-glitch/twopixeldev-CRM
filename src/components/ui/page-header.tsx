import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-[12rem] flex-1">
        {eyebrow && <div className="text-[15px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-xl border border-navy-600 bg-navy-800 p-4 ${className}`}>{children}</section>;
}
