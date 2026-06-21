import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

export let smoother: ScrollSmoother | null = null;

let scrollEnabled = false;

export function initScrollSmoother() {
  if (smoother) return smoother;

  const wrapper = document.querySelector("#smooth-wrapper");
  const content = document.querySelector("#smooth-content");
  if (!wrapper || !content) return null;

  try {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.2,
      effects: true,
      autoResize: true,
      ignoreMobileResize: true,
      normalizeScroll: true,
    });
    smoother.scrollTop(0);
    smoother.paused(false);
    return smoother;
  } catch (err) {
    console.error("[ScrollSmoother] init failed:", err);
    smoother = null;
    return null;
  }
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
    if (tries < 60) requestAnimationFrame(() => attempt(tries + 1));
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
