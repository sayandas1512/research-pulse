import type { ReactNode } from "react";

export function PageShell({ children, maxWidth = "3xl" }: { children: ReactNode; maxWidth?: "2xl" | "3xl" | "4xl" }) {
  const widths = { "2xl": "max-w-2xl", "3xl": "max-w-3xl", "4xl": "max-w-4xl" };
  return <main className={`mx-auto w-full ${widths[maxWidth]} flex-1 px-6 py-10`}>{children}</main>;
}

export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
      {description && <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{description}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/[0.02] ${className}`}
    >
      {children}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-[var(--surface-muted)] text-[var(--muted)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  solid: "bg-[var(--foreground)] text-[var(--background)]",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
const buttonVariants = {
  primary: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90",
  secondary: "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
  ghost: "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
  danger: "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-500/10",
};

export function buttonClass(variant: keyof typeof buttonVariants = "secondary", className = ""): string {
  return `${buttonBase} ${buttonVariants[variant]} ${className}`;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{children}</span>;
}
