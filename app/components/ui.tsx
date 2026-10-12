import type { ReactNode } from "react";
import { Reveal } from "./motion/Reveal";
import { HoverCard } from "./motion/HoverCard";

export function PageShell({ children, maxWidth = "3xl" }: { children: ReactNode; maxWidth?: "2xl" | "3xl" | "4xl" }) {
  const widths = { "2xl": "max-w-2xl", "3xl": "max-w-3xl", "4xl": "max-w-4xl" };
  return (
    <Reveal as="main" className={`mx-auto w-full ${widths[maxWidth]} flex-1 px-6 py-10 lg:py-14`}>
      {children}
    </Reveal>
  );
}

export function PageHeader({
  title,
  description,
  kicker,
}: {
  title: string;
  description?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="mb-10 border-b border-[var(--rule)] pb-6">
      {kicker && <Kicker>{kicker}</Kicker>}
      <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>}
    </div>
  );
}

/** Small mono, letter-spaced line above a heading — the "section label" of a printed journal. */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{children}</p>;
}

export function Card({
  children,
  className = "",
  tilt = false,
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  return (
    <HoverCard
      tilt={tilt}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-[border-color,box-shadow] duration-300 hover:border-[var(--accent)]/35 hover:shadow-[0_18px_40px_-24px_rgba(35,65,181,0.35)] ${className}`}
    >
      {children}
    </HoverCard>
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
    <Reveal
      as="span"
      scroll={false}
      y={0}
      duration={0.25}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${badgeTones[tone]} ${className}`}
    >
      {children}
    </Reveal>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
const buttonVariants = {
  primary: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 hover:shadow-md hover:shadow-[var(--accent)]/20",
  secondary: "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)]/40",
  ghost: "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
  danger: "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-500/10",
};

export function buttonClass(variant: keyof typeof buttonVariants = "secondary", className = ""): string {
  return `${buttonBase} ${buttonVariants[variant]} ${className}`;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] px-6 py-12 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{children}</span>;
}
