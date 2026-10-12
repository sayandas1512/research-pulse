"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ensureGsapPlugins, gsap } from "./motion/gsap";

// One screen-recording-style walkthrough (scripts/walkthrough), split into chapters by start time.
const VIDEO = { mp4: "/videos/workflow.mp4", webm: "/videos/workflow.webm", poster: "/videos/workflow-poster.jpg" };

const CHAPTERS = [
  {
    start: 0,
    tab: "Domains",
    title: "Pick what to follow",
    body: "Switch on the research areas you care about. Each one carries its own keywords and arXiv categories, and the run happens every Monday.",
  },
  {
    start: 5.6,
    tab: "Collect",
    title: "Hundreds of preprints in",
    body: "New arXiv papers are pulled in and ranked on cheap signals: Hugging Face upvotes, GitHub stars, and whether code is out.",
  },
  {
    start: 11.4,
    tab: "Judge",
    title: "Signal, not noise",
    body: "Gemini scores the shortlist from 0 to 10 for significance to your work. Only papers scoring 6 or more make the brief.",
  },
  {
    start: 17.1,
    tab: "Read",
    title: "Ten minutes with your coffee",
    body: "One short brief lands in your inbox: what changed, the caveat, and whether to read, skim or flag it for a client.",
  },
];

function chapterAt(time: number) {
  let idx = 0;
  CHAPTERS.forEach((c, i) => {
    if (time >= c.start - 0.05) idx = i;
  });
  return idx;
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Elicit-style product walkthrough: one looping video, chapter tabs that jump to each step, and a
 * progress bar. GSAP handles the scroll-in frame reveal and caption transitions. */
export default function DemoReel() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Play only while on screen; follow the playhead for the active chapter and progress bar.
  useEffect(() => {
    const v = videoRef.current;
    const frame = frameRef.current;
    const bar = progressRef.current;
    if (!v || !frame || !bar) return;
    const setWidth = gsap.quickSetter(bar, "width", "%");
    const onTime = () => {
      setWidth(v.duration ? (v.currentTime / v.duration) * 100 : 0);
      setActive(chapterAt(v.currentTime));
    };
    v.addEventListener("timeupdate", onTime);
    let io: IntersectionObserver | undefined;
    if (!reduced) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        },
        { threshold: 0.35 },
      );
      io.observe(frame);
    }
    return () => {
      v.removeEventListener("timeupdate", onTime);
      io?.disconnect();
    };
  }, [reduced]);

  // Caption slides in whenever the chapter changes.
  useEffect(() => {
    if (reduced || !captionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        captionRef.current!.children,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" },
      );
    });
    return () => ctx.revert();
  }, [active, reduced]);

  function jumpTo(i: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = CHAPTERS[i].start;
    setActive(i);
    if (!reduced) void v.play().catch(() => {});
  }

  const chapter = CHAPTERS[active];

  return (
    <div ref={sectionRef}>
      <div role="tablist" aria-label="Walkthrough steps" className="mb-6 flex flex-wrap gap-2">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.tab}
            role="tab"
            aria-selected={i === active}
            onClick={() => jumpTo(i)}
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
        <video
          ref={videoRef}
          poster={VIDEO.poster}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          aria-label="Walkthrough of the weekly run: choose domains, collect papers, judge significance, read the brief"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={VIDEO.mp4} type="video/mp4" />
          <source src={VIDEO.webm} type="video/webm" />
        </video>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
          <div ref={progressRef} className="h-full w-0 bg-[var(--accent-2)]" />
        </div>
      </div>

      <div ref={captionRef} aria-live="polite" className="mt-6 grid gap-2 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
        <p className="font-serif text-2xl leading-tight">{chapter.title}</p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{chapter.body}</p>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Product walkthrough · sample papers, not live data
      </p>
    </div>
  );
}
