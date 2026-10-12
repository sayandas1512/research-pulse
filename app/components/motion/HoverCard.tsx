"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, hasFinePointer, prefersReducedMotion } from "./gsap";

/** Card surface that lifts on hover; with `tilt`, it also tilts toward the cursor in 3D. */
export function HoverCard({
  children,
  className = "",
  tilt = false,
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !hasFinePointer()) return;

    gsap.set(el, { transformPerspective: 900 });
    const rxTo = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ryTo = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });

    const onEnter = () => gsap.to(el, { y: -3, duration: 0.35, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      if (!tilt) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ryTo(px * 6);
      rxTo(-py * 6);
    };
    const onLeave = () => gsap.to(el, { y: 0, rotationX: 0, rotationY: 0, duration: 0.6, ease: "power3.out" });

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform" });
    };
  }, [tilt]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
