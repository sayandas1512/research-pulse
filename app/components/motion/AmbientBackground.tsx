"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "./gsap";

// One EKG beat per 200 units, repeated across the width — echoes the Research Pulse mark.
const BEAT = "h70 l12 -34 l16 68 l14 -52 l10 18 h78";
const PULSE_PATH = `M0 60 ${Array.from({ length: 8 }, () => BEAT).join(" ")}`;

/** Drifting blurred orbs plus a pulse line with a travelling highlight, behind the hero. */
export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".ambient-orb").forEach((orb, i) => {
        gsap.to(orb, {
          x: () => gsap.utils.random(-60, 60),
          y: () => gsap.utils.random(-40, 40),
          scale: () => gsap.utils.random(0.9, 1.15),
          duration: 9 + i * 3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
        });
      });
      const glow = el.querySelector<SVGPathElement>(".ambient-pulse-glow");
      if (glow) {
        const len = glow.getTotalLength();
        const dash = len * 0.07;
        gsap.set(glow, { strokeDasharray: `${dash} ${len}`, opacity: 0.75 });
        gsap.fromTo(glow, { strokeDashoffset: len + dash }, { strokeDashoffset: 0, duration: 7, ease: "none", repeat: -1 });
      }
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="ambient-orb absolute -left-16 top-4 h-72 w-72 rounded-full bg-[var(--orb-a)] opacity-60 blur-3xl" />
      <div className="ambient-orb absolute right-0 top-24 h-64 w-64 rounded-full bg-[var(--orb-b)] opacity-50 blur-3xl" />
      <svg
        className="absolute inset-x-0 bottom-6 h-24 w-full"
        viewBox="0 0 1600 120"
        preserveAspectRatio="none"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={PULSE_PATH} stroke="var(--rule)" strokeWidth="1.5" />
        {/* Hidden until JS measures the path and starts the travelling highlight. */}
        <path className="ambient-pulse-glow" d={PULSE_PATH} stroke="var(--accent)" strokeWidth="2.5" opacity="0" />
      </svg>
    </div>
  );
}
