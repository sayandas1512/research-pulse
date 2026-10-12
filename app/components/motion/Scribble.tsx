"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ensureGsapPlugins, gsap, prefersReducedMotion } from "./gsap";

// Hand-drawn marks, drawn loosely so they read as a pen stroke rather than a CSS border.
const PATHS = {
  underline: { viewBox: "0 0 200 20", d: "M3 13 C 40 6, 90 16, 130 9 S 185 7, 197 12" },
  circle: {
    viewBox: "0 0 200 60",
    d: "M108 6 C 52 2, 8 12, 6 30 C 4 48, 50 57, 104 55 C 158 53, 196 44, 194 27 C 192 11, 150 3, 92 9",
  },
} as const;

/** Wraps text with a marker-style underline or circle that draws itself in (GSAP, on scroll).
 * Rendered fully drawn on the server, so it's visible without JS or with reduced motion. */
export function Scribble({
  children,
  variant = "underline",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof PATHS;
  delay?: number;
  className?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || prefersReducedMotion()) return;
    ensureGsapPlugins();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        path,
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          duration: variant === "circle" ? 0.9 : 0.7,
          delay: delay / 1000,
          ease: "power2.inOut",
          scrollTrigger: { trigger: path, start: "top 92%", once: true },
        },
      );
    });
    return () => ctx.revert();
  }, [variant, delay]);

  const { viewBox, d } = PATHS[variant];
  const svgPosition =
    variant === "circle" ? "left-[-14%] top-[-45%] h-[190%] w-[128%]" : "-bottom-[0.18em] left-0 h-[0.35em] w-full";

  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <svg
        aria-hidden
        viewBox={viewBox}
        preserveAspectRatio="none"
        className={`pointer-events-none absolute overflow-visible ${svgPosition}`}
        fill="none"
      >
        <path
          ref={pathRef}
          d={d}
          pathLength={1}
          stroke="var(--accent-2)"
          strokeWidth={variant === "circle" ? 2.5 : 5}
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={0}
        />
      </svg>
    </span>
  );
}
