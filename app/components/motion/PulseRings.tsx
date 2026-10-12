"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function PulseRings() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rings = container.querySelectorAll<HTMLElement>(".pulse-ring");
    const ctx = gsap.context(() => {
      rings.forEach((ring, i) => {
        gsap.fromTo(
          ring,
          { scale: 0.6, opacity: 0.5 },
          { scale: 2.2, opacity: 0, duration: 2.8, ease: "power1.out", repeat: -1, delay: i * 0.9 },
        );
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="pulse-ring absolute h-14 w-14 rounded-full border border-[var(--accent)]" />
      <span className="pulse-ring absolute h-14 w-14 rounded-full border border-[var(--accent)]" />
      <span className="pulse-ring absolute h-14 w-14 rounded-full border border-[var(--accent)]" />
    </div>
  );
}
