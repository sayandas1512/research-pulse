"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "./gsap";

export interface TickerItem {
  label: string;
  title: string;
}

/** News-style strip of this week's paper titles that scrolls slowly and pauses on hover.
 * The list is rendered twice so the loop is seamless; the copy is hidden from screen readers. */
export function Ticker({ items, href }: { items: TickerItem[]; href: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // One copy's width is half the track; ~45px/s keeps titles comfortably readable.
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: track.scrollWidth / 2 / 45,
        ease: "none",
        repeat: -1,
      });
      const pause = () => gsap.to(tween, { timeScale: 0, duration: 0.4 });
      const play = () => gsap.to(tween, { timeScale: 1, duration: 0.4 });
      track.addEventListener("pointerenter", pause);
      track.addEventListener("pointerleave", play);
      track.addEventListener("focusin", pause);
      track.addEventListener("focusout", play);
      return () => {
        track.removeEventListener("pointerenter", pause);
        track.removeEventListener("pointerleave", play);
        track.removeEventListener("focusin", pause);
        track.removeEventListener("focusout", play);
      };
    }, track);
    return () => ctx.revert();
  }, [items]);

  if (items.length === 0) return null;

  const renderList = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <li key={i} className="flex shrink-0 items-center">
          <a
            href={href}
            tabIndex={copy ? -1 : undefined}
            className="flex items-baseline gap-2 px-5 py-2.5 transition-colors hover:text-[var(--accent)]"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-2)]">{item.label}</span>
            <span className="whitespace-nowrap font-serif text-[15px] italic">{item.title}</span>
          </a>
          <span aria-hidden className="text-[var(--rule)]">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative overflow-hidden border-y border-[var(--rule)] bg-[var(--surface)]/70 text-[var(--foreground)] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div ref={trackRef} className="flex w-max">
        {renderList(false)}
        {renderList(true)}
      </div>
    </div>
  );
}
