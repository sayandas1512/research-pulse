"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
  { href: "/runs", label: "Runs" },
  { href: "/log", label: "Log" },
  { href: "/backtest", label: "Backtest" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3 text-sm">
        <Link href="/" className="mr-4 flex items-center gap-2 font-semibold text-[var(--foreground)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-bold text-[var(--accent-foreground)]">
            RP
          </span>
          Research Pulse
        </Link>
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                active
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
