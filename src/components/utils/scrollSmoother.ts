import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

export let smoother: ScrollSmoother | null = null;

let scrollEnabled = false;

function getScrollConfig() {
  const isTouch = ScrollTrigger.isTouch === 1;
  const isMobile = window.innerWidth <= 1024;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    return { smooth: 0, effects: false };
  }

  if (isTouch || isMobile) {
    return { smooth: 0.5, effects: false };
  }

  return { smooth: 0.85, effects: false };
}

export function initScrollSmoother(startPaused = false) {
  if (smoother) return smoother;

  const wrapper = document.querySelector("#smooth-wrapper");
  const content = document.querySelector("#smooth-content");
  if (!wrapper || !content) return null;

  const { smooth, effects } = getScrollConfig();

  try {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth,
      effects,
      autoResize: true,
      ignoreMobileResize: true,
      normalizeScroll: true,
    });
    smoother.scrollTop(0);
    smoother.paused(startPaused);
    return smoother;
  } catch (err) {
    console.error("[ScrollSmoother] init failed:", err);
    smoother = null;
    return null;
  }
}

/** Warm up ScrollSmoother during the loading screen so reveal is instant. */
export function prepareScrollSmoother() {
  return initScrollSmoother(true);
}

/** Enable smooth scroll once after the loading screen finishes. */
export function enableScroll() {
  if (scrollEnabled && smoother) {
    smoother.paused(false);
    return;
  }

  const finish = (instance: ScrollSmoother) => {
    scrollEnabled = true;
    instance.paused(false);
    // Soft refresh only — hard refresh(true) resets scroll position mid-gesture.
    requestAnimationFrame(() => {
      instance.refresh(false);
    });
  };

  const attempt = (tries = 0) => {
    const instance = initScrollSmoother();
    if (instance) {
      finish(instance);
      return;
    }
    if (tries < 60) {
      requestAnimationFrame(() => attempt(tries + 1));
      return;
    }
    document.body.style.overflow = "auto";
    const wrapper = document.querySelector("#smooth-wrapper") as HTMLElement | null;
    if (wrapper) wrapper.style.overflow = "auto";
  };

  attempt();
}

/** Layout changed (resize, WebGL mount). Preserve scroll position with soft refresh. */
export function refreshScrollSmoother() {
  smoother?.refresh(false);
}

export function killScrollSmoother() {
  smoother?.kill();
  smoother = null;
}
