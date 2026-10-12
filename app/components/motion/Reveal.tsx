"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";

export function Reveal({
  children,
  delay = 0,
  y = 8,
  duration = 0.4,
  className = "",
  as = "div",
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el, { opacity: 0, y, duration, delay: delay / 1000, ease: "power2.out" });
    }, el);
    return () => ctx.revert();
  }, [delay, y, duration]);

  const Tag = as;
  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
