"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { ensureGsapPlugins, gsap, prefersReducedMotion, scheduleScrollRefresh } from "./gsap";

/** Fades/slides its content in the first time it scrolls into view (ScrollTrigger), so long
 * pages like the brief and the log reveal as Kavita reads rather than all at once on load. */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  duration = 0.6,
  className = "",
  as = "div",
  scroll = true,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  as?: ElementType;
  /** false for fixed-position elements (e.g. toasts) that should animate immediately. */
  scroll?: boolean;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    ensureGsapPlugins();
    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        y,
        duration,
        delay: delay / 1000,
        ease: "power3.out",
        scrollTrigger: scroll ? { trigger: el, start: "top 94%", once: true } : undefined,
      });
    }, el);
    if (scroll) scheduleScrollRefresh();
    return () => ctx.revert();
  }, [delay, y, duration, scroll]);

  const Tag = as;
  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
