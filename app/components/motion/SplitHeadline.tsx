"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ensureGsapPlugins, gsap, prefersReducedMotion, SplitText } from "./gsap";

/** Headline that reveals word by word, rising from a soft blur into focus. */
export function SplitHeadline({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    ensureGsapPlugins();

    let split: SplitText | null = null;
    let cancelled = false;
    const ctx = gsap.context(() => {});
    // Split after the display font loads so word boxes are measured with the real glyphs.
    gsap.set(el, { autoAlpha: 0 });
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ctx.add(() => {
        split = SplitText.create(el, { type: "words" });
        gsap.set(el, { autoAlpha: 1 });
        gsap.from(split.words, {
          yPercent: 40,
          opacity: 0,
          filter: "blur(10px)",
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
        });
      });
    });

    return () => {
      cancelled = true;
      ctx.revert();
      split?.revert();
      gsap.set(el, { clearProps: "visibility,opacity" });
    };
  }, []);

  return (
    <h1 ref={ref} className={className}>
      {children}
    </h1>
  );
}
