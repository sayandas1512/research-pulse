"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ensureGsapPlugins, gsap } from "./motion/gsap";

const CLIPS = [
  {
    src: "/videos/papers-to-brief.mp4",
    tab: "Collect",
    title: "Hundreds of preprints in",
    body: "Every Monday, each domain's new arXiv papers are pulled in and ranked on cheap signals: keyword fit, upvotes, code, stars.",
  },
  {
    src: "/videos/pulse-line.mp4",
    tab: "Judge",
    title: "Signal, not noise",
    body: "Gemini scores the shortlist from 0 to 10 for significance to your work. Only papers scoring 6 or more make the brief.",
  },
  {
    src: "/videos/morning-read.mp4",
    tab: "Read",
    title: "Ten minutes with your coffee",
    body: "One short brief lands in your inbox: what changed, the caveat, and whether to read, skim or flag it for a client.",
  },
];

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Elicit-style feature reel: tabbed, auto-advancing clips with a progress bar. GSAP handles
 * the scroll-in frame reveal, clip crossfades and caption transitions. */
export default function DemoReel() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );

  // Frame "opens up" as it scrolls into view.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || reduced) return;
    ensureGsapPlugins();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        frame,
        { clipPath: "inset(12% 10% 12% 10% round 28px)", scale: 0.96 },
        {
          clipPath: "inset(0% 0% 0% 0% round 20px)",
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: frame, start: "top 90%", end: "top 35%", scrub: 0.6 },
        },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  // Crossfade to the active clip, restart it, and animate the caption.
  useEffect(() => {
    const videos = videoRefs.current;
    videos.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        if (!reduced) void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
    if (reduced) {
      videos.forEach((v, i) => v && gsap.set(v, { autoAlpha: i === active ? 1 : 0 }));
      return;
    }
    const ctx = gsap.context(() => {
      videos.forEach((v, i) => v && gsap.to(v, { autoAlpha: i === active ? 1 : 0, duration: 0.6, ease: "power2.out" }));
      if (captionRef.current) {
        gsap.fromTo(
          captionRef.current.children,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" },
        );
      }
    });
    return () => ctx.revert();
  }, [active, reduced]);

  // Progress bar follows the playing clip; advance to the next tab when it ends.
  useEffect(() => {
    const v = videoRefs.current[active];
    const bar = progressRef.current;
    if (!v || !bar) return;
    const setWidth = gsap.quickSetter(bar, "width", "%");
    const onTime = () => setWidth(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    const onEnded = () => setActive((a) => (a + 1) % CLIPS.length);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [active]);

  const clip = CLIPS[active];

  return (
    <div ref={sectionRef}>
      <div role="tablist" aria-label="Demo clips" className="mb-6 flex flex-wrap gap-2">
        {CLIPS.map((c, i) => (
          <button
            key={c.tab}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              i === active
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            <span className="mr-1.5 font-mono text-[10px] opacity-70">0{i + 1}</span>
            {c.tab}
          </button>
        ))}
      </div>

      <div
        ref={frameRef}
        className="relative aspect-video overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[0_40px_80px_-40px_rgba(31,26,20,0.45)]"
      >
        {CLIPS.map((c, i) => (
          <video
            key={c.src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            src={c.src}
            muted
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            controls={reduced}
            aria-label={c.title}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
          <div ref={progressRef} className="h-full w-0 bg-[var(--accent-2)]" />
        </div>
      </div>

      <div ref={captionRef} aria-live="polite" className="mt-6 grid gap-2 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
        <p className="font-serif text-2xl leading-tight">{clip.title}</p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{clip.body}</p>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Illustrative clips generated with Google Veo
      </p>
    </div>
  );
}
