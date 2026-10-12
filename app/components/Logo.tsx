"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/** EKG/pulse-line mark — ties directly to "Research Pulse," reads clearly at nav-bar size. */
export function Logo({ size = 24, animated = false }: { size?: number; animated?: boolean }) {
  const glowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!animated) return;
    const el = glowRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: 1, opacity: 0.45 },
        { scale: 1.6, opacity: 0, duration: 1.4, repeat: -1, ease: "power1.out" },
      );
    }, el);
    return () => ctx.revert();
  }, [animated]);

  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {animated && <span ref={glowRef} aria-hidden className="absolute inset-0 rounded-lg bg-[var(--accent)] opacity-0" />}
      <span className="relative z-10 inline-flex h-full w-full items-center justify-center rounded-lg bg-[var(--accent)]">
        <svg
          width={size * 0.65}
          height={size * 0.65}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-foreground)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12h4l2-7 4 14 3-11 2 4h5" />
        </svg>
      </span>
    </span>
  );
}
