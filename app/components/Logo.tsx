/** EKG/pulse-line mark — ties directly to "Research Pulse," reads clearly at nav-bar size. */
export function Logo({ size = 24, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] ${animated ? "animate-pulse-glow" : ""}`}
      style={{ width: size, height: size }}
    >
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
  );
}
