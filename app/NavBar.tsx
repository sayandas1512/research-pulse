"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./components/Logo";

const LINKS = [
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
  { href: "/runs", label: "Runs" },
  { href: "/log", label: "Log" },
  { href: "/export", label: "Export" },
  { href: "/backtest", label: "Backtest" },
];

function Wordmark() {
  return (
    <Link href="/" className="mr-4 flex items-center gap-2 font-semibold text-[var(--foreground)]">
      <Logo size={24} />
      Research Pulse
    </Link>
  );
}

/** Static shell shown while NavBar (which needs usePathname, a request-time hook under
 * Cache Components) streams in — same links, no active-state highlight yet, no layout shift. */
export function NavBarFallback() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3 text-sm">
        <Wordmark />
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-md px-2.5 py-1.5 text-[var(--muted)]">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3 text-sm">
        <Wordmark />
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-2.5 py-1.5 transition-all duration-150 ${
                active
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:scale-[1.04] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
