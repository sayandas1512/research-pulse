"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "./components/Logo";
import { Magnetic } from "./components/motion/Magnetic";
import { gsap, prefersReducedMotion } from "./components/motion/gsap";
import { OPEN_ASSISTANT_EVENT } from "./components/events";

const GROUPS = [
  {
    label: "Read",
    links: [
      { href: "/archive", label: "Archive", hint: "Every weekly brief" },
      { href: "/log", label: "Log", hint: "Search all papers" },
      { href: "/export", label: "Export", hint: "Client-ready digest" },
    ],
  },
  {
    label: "Manage",
    links: [
      { href: "/settings", label: "Settings", hint: "Domains to monitor" },
      { href: "/runs", label: "Run health", hint: "Pipeline status" },
      { href: "/backtest", label: "Backtest", hint: "Check recall" },
    ],
  },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[var(--foreground)]">
      <Logo size={28} />
      <span className="font-serif text-2xl leading-none tracking-tight">Research Pulse</span>
    </Link>
  );
}

function isActive(pathname: string | null, href: string) {
  return !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
}

function Sidebar({ pathname }: { pathname: string | null }) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // Slide a single highlight to the active link instead of swapping backgrounds per link.
  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const place = (animate: boolean) => {
      const active = list.querySelector<HTMLElement>("[data-active='true']");
      if (!active) {
        gsap.to(indicator, { autoAlpha: 0, duration: animate ? 0.2 : 0 });
        return;
      }
      // Measure the <li>, not the link: the link sits inside a transformed Magnetic wrapper,
      // which would become its offsetParent and skew offsetTop.
      const item = (active.closest("li") ?? active).getBoundingClientRect();
      const props = { y: item.top - list.getBoundingClientRect().top, height: item.height, autoAlpha: 1 };
      if (animate && !prefersReducedMotion()) gsap.to(indicator, { ...props, duration: 0.45, ease: "power3.out" });
      else gsap.set(indicator, props);
    };

    place(indicator.dataset.placed === "true");
    indicator.dataset.placed = "true";
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 order-first border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur lg:order-last lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-l">
      <div className="flex h-full flex-col gap-4 px-4 py-3 lg:gap-8 lg:px-6 lg:py-8">
        <div className="flex items-center justify-between">
          <Wordmark />
        </div>

        <nav aria-label="Main" className="relative -mx-1 overflow-x-auto [scrollbar-width:none] lg:mx-0 lg:overflow-visible">
          <div ref={listRef} className="relative flex gap-1 px-1 lg:flex-col lg:gap-6 lg:px-0">
            <span
              ref={indicatorRef}
              aria-hidden
              className="pointer-events-none invisible absolute left-0 top-0 hidden w-full rounded-lg bg-[var(--accent-soft)] lg:block"
            >
              <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]" />
            </span>
            {GROUPS.map((group) => (
              <div key={group.label} className="contents lg:block">
                <p className="mb-2 hidden px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] lg:block">
                  {group.label}
                </p>
                <ul className="contents lg:flex lg:flex-col lg:gap-0.5">
                  {group.links.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <li key={link.href} className="shrink-0">
                        <Magnetic strength={0.15} className="lg:block">
                          <Link
                            href={link.href}
                            data-active={active}
                            aria-current={active ? "page" : undefined}
                            className={`relative z-10 block rounded-lg px-3 py-1.5 text-sm transition-colors lg:py-2 ${
                              active
                                ? "font-medium text-[var(--accent)] max-lg:bg-[var(--accent-soft)]"
                                : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                          >
                            {link.label}
                            <span className="hidden text-xs font-normal text-[var(--muted)] lg:block">{link.hint}</span>
                          </Link>
                        </Magnetic>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="mt-auto hidden lg:block">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left transition-colors hover:border-[var(--accent)]/50"
          >
            <span className="block font-serif text-lg leading-tight text-[var(--foreground)]">Have a question?</span>
            <span className="mt-1 block text-xs text-[var(--muted)]">Ask the assistant about your briefs or how anything works.</span>
          </button>
          <p className="mt-4 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Prepared for Kavita</p>
        </div>
      </div>
    </header>
  );
}

/** Shown while NavBar (which needs usePathname, a request-time hook under Cache Components)
 * streams in — same column and links, just no active highlight yet, so there's no layout shift. */
export function NavBarFallback() {
  return <Sidebar pathname={null} />;
}

export default function NavBar() {
  const pathname = usePathname();
  return <Sidebar pathname={pathname} />;
}
