"use client";

import { useEffect, useRef } from "react";
import { ensureGsapPlugins, gsap, prefersReducedMotion } from "./gsap";

/** Number that ticks up from 0 when it scrolls into view. Server-renders the final value,
 * so it's correct with JS disabled or reduced motion. */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || value === 0) return;
    ensureGsapPlugins();
    const format = (n: number) => Math.round(n).toLocaleString("en-US");
    const counter = { n: 0 };
    const ctx = gsap.context(() => {
      el.textContent = format(0);
      gsap.to(counter, {
        n: value,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
        onUpdate: () => {
          el.textContent = format(counter.n);
        },
        onComplete: () => {
          el.textContent = format(value);
        },
      });
    }, el);
    return () => {
      ctx.revert();
      el.textContent = format(value);
    };
  }, [value]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value.toLocaleString("en-US")}
    </span>
  );
}
