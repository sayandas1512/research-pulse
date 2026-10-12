import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

/** Registers the GSAP plugins once, client-side only (call from inside an effect). */
export function ensureGsapPlugins() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True only for a real mouse/trackpad — hover effects are skipped on touch screens. */
export function hasFinePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

let refreshQueued = false;

/** Content streams in through Suspense after ScrollTriggers are created, which shifts layout;
 * batch a single refresh per frame so trigger positions stay accurate. */
export function scheduleScrollRefresh() {
  if (refreshQueued || typeof window === "undefined") return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    ScrollTrigger.refresh();
  });
}

export { gsap, ScrollTrigger, SplitText };
